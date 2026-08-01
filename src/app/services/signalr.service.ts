import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

/** État du tuyau temps réel, tel que la barre d'état l'affiche. */
export type HubState = 'offline' | 'connecting' | 'online' | 'reconnecting';

@Injectable({ providedIn: 'root' })
export class SignalRService {
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

  /**
   * Qui est connecté — l'ensemble des identifiants, pas un compte.
   *
   * Deux composants suivaient la présence chacun de son côté à partir des
   * mêmes événements. La table des utilisateurs se gardait des doublons ;
   * la barre d'état, non : elle incrémentait à chaque `UserOnline` reçu.
   * Une personne ouvrant trois onglets la faisait monter de trois, et
   * n'en rendait qu'un en partant — le compteur dérivait à la hausse et
   * ne redescendait qu'au rechargement de la page.
   *
   * Un ensemble d'identifiants rend l'erreur impossible : ajouter deux
   * fois la même personne ne change rien, et le compte est sa taille.
   */
  private presents = signal<ReadonlySet<string>>(new Set<string>());
  onlineUserIds = this.presents.asReadonly();
  onlineCount = computed(() => this.presents().size);

  /**
   * Le hub n'annonce que les changements : celui qui se connecte
   * n'apprend jamais qui était déjà là. L'état de départ vient donc de
   * l'API, et se réamorce après une coupure — les événements survenus
   * pendant la reconnexion sont perdus pour toujours.
   */
  seedPresence(userIds: Iterable<string>) {
    this.presents.set(new Set(userIds));
  }

  private setPresence(userId: string, present: boolean) {
    this.presents.update((actuels) => {
      if (actuels.has(userId) === present) return actuels;
      const suivant = new Set(actuels);
      present ? suivant.add(userId) : suivant.delete(userId);
      return suivant;
    });
  }

  newMessage$ = new Subject<any>();
  unreadCountUpdate$ = new Subject<void>();
  userTyping$ = new Subject<{ userId: string; applicationId: number }>();
  userStoppedTyping$ = new Subject<{ userId: string; applicationId: number }>();
  userOnline$ = new Subject<string>();
  userOffline$ = new Subject<string>();
  applicationStatusChanged$ = new Subject<{ applicationId: number; status: string; jobTitle: string; company: string }>();
  newApplication$ = new Subject<{ applicationId: number; candidateName: string; jobTitle: string }>();
  newNotification$ = new Subject<void>();

  /** Le tuyau est revenu : ce qui dépend de la présence doit se réamorcer. */
  reconnected$ = new Subject<void>();

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
    // Aucun `NgZone.run` ici, et ce n'est pas un oubli : l'application
    // tourne sans zone.js — `NgZone` y est un `NoopNgZone` dont le `run`
    // se contente d'appeler la fonction. Ce qui déclenche le rendu, c'est
    // l'écriture dans un signal, d'où qu'elle vienne. Envelopper ces
    // rappels donnait l'illusion d'une garantie qui n'existait pas.
    const on = (event: string, handler: (data: any) => void) => {
      this.hubConnection!.on(event, (data: any) => {
        this.eventCount.update((n) => n + 1);
        this.lastEventAt.set(Date.now());
        handler(data);
      });
    };

    on('NewMessage', (data) => this.newMessage$.next(data));
    on('UnreadCountUpdate', () => this.unreadCountUpdate$.next());
    on('UserTyping', (data) => this.userTyping$.next(data));
    on('UserStoppedTyping', (data) => this.userStoppedTyping$.next(data));
    // La présence est tenue ici, une fois pour toutes ; les flux restent
    // pour qui veut réagir à l'événement lui-même.
    on('UserOnline', (userId) => { this.setPresence(userId, true); this.userOnline$.next(userId); });
    on('UserOffline', (userId) => { this.setPresence(userId, false); this.userOffline$.next(userId); });
    on('ApplicationStatusChanged', (data) => this.applicationStatusChanged$.next(data));
    on('NewApplication', (data) => this.newApplication$.next(data));
    on('NewNotification', () => this.newNotification$.next());

    this.hubConnection.onreconnecting(() => this.state.set('reconnecting'));

    // Les événements émis pendant la coupure sont perdus : la présence
    // retenue est celle d'avant, et rien ne la corrigera. Elle est donc
    // vidée, à charge pour la vue de la réamorcer depuis l'API.
    this.hubConnection.onreconnected(() => {
      this.state.set('online');
      this.presents.set(new Set());
      this.reconnected$.next();
    });

    this.hubConnection.onclose(() => {
      this.state.set('offline');
      this.presents.set(new Set());
    });

    this.state.set('connecting');
    this.hubConnection.start()
      .then(() => this.state.set('online'))
      .catch((err) => {
        this.state.set('offline');
        console.error('[SignalR] Connection failed:', err);
      });
  }

  stop(): void {
    this.hubConnection?.stop();
    this.hubConnection = null;
    this.state.set('offline');
    this.presents.set(new Set());
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
