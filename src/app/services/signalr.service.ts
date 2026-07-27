import { Injectable, inject, signal, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

/** État du tuyau temps réel, tel que la barre d'état l'affiche. */
export type HubState = 'offline' | 'connecting' | 'online' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private zone = inject(NgZone);
  private hubConnection: signalR.HubConnection | null = null;

  /**
   * L'état de la connexion et le flux d'événements sont exposés en signals
   * plutôt qu'en Subject : la barre d'état les lit dans son gabarit sans
   * s'abonner ni se désabonner, et deux composants peuvent les lire sans
   * se voler les valeurs d'un flux à diffusion unique.
   */
  state = signal<HubState>('offline');
  eventCount = signal(0);
  lastEventAt = signal<number | null>(null);

  newMessage$ = new Subject<any>();
  unreadCountUpdate$ = new Subject<void>();
  userTyping$ = new Subject<{ userId: string; applicationId: number }>();
  userStoppedTyping$ = new Subject<{ userId: string; applicationId: number }>();
  userOnline$ = new Subject<string>();
  userOffline$ = new Subject<string>();
  applicationStatusChanged$ = new Subject<{ applicationId: number; status: string; jobTitle: string; company: string }>();
  newApplication$ = new Subject<{ applicationId: number; candidateName: string; jobTitle: string }>();
  newNotification$ = new Subject<void>();

  start(token: string): void {
    if (this.hubConnection) return;

    const hubUrl = environment.apiUrl.replace(/\/api\/?$/, '') + '/hubs/chat';
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    // Chaque message du hub compte comme un evenement temps reel : la
    // barre d'etat s'en sert pour montrer que le tuyau vit vraiment, et
    // pas seulement qu'il est ouvert.
    const on = (event: string, handler: (data: any) => void) => {
      this.hubConnection!.on(event, (data: any) =>
        this.zone.run(() => {
          this.eventCount.update((n) => n + 1);
          this.lastEventAt.set(Date.now());
          handler(data);
        }),
      );
    };

    on('NewMessage', (data) => this.newMessage$.next(data));
    on('UnreadCountUpdate', () => this.unreadCountUpdate$.next());
    on('UserTyping', (data) => this.userTyping$.next(data));
    on('UserStoppedTyping', (data) => this.userStoppedTyping$.next(data));
    on('UserOnline', (userId) => this.userOnline$.next(userId));
    on('UserOffline', (userId) => this.userOffline$.next(userId));
    on('ApplicationStatusChanged', (data) => this.applicationStatusChanged$.next(data));
    on('NewApplication', (data) => this.newApplication$.next(data));
    on('NewNotification', () => this.newNotification$.next());

    // Les rappels de reconnexion arrivent hors zone Angular : sans
    // zone.run, le signal changerait sans que la vue s'en apercoive.
    this.hubConnection.onreconnecting(() => this.zone.run(() => this.state.set('reconnecting')));
    this.hubConnection.onreconnected(() => this.zone.run(() => this.state.set('online')));
    this.hubConnection.onclose(() => this.zone.run(() => this.state.set('offline')));

    this.state.set('connecting');
    this.hubConnection.start().then(() => {
      this.zone.run(() => this.state.set('online'));
    }).catch((err) => {
      this.zone.run(() => this.state.set('offline'));
      console.error('[SignalR] Connection failed:', err);
    });
  }

  stop(): void {
    this.hubConnection?.stop();
    this.hubConnection = null;
    this.state.set('offline');
  }

  joinConversation(applicationId: number): void {
    this.hubConnection?.invoke('JoinConversation', applicationId).catch(() => {});
  }

  leaveConversation(applicationId: number): void {
    this.hubConnection?.invoke('LeaveConversation', applicationId).catch(() => {});
  }

  sendTyping(applicationId: number): void {
    this.hubConnection?.invoke('SendTyping', applicationId).catch(() => {});
  }

  stopTyping(applicationId: number): void {
    this.hubConnection?.invoke('StopTyping', applicationId).catch(() => {});
  }
}
