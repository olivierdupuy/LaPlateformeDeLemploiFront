import { Injectable, inject, NgZone } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SignalRService {
  private zone = inject(NgZone);
  private hubConnection: signalR.HubConnection | null = null;

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

    const hubUrl = environment.apiUrl.replace('/api', '/hubs/chat');
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .build();

    this.hubConnection.on('NewMessage', (data) => this.zone.run(() => this.newMessage$.next(data)));
    this.hubConnection.on('UnreadCountUpdate', () => this.zone.run(() => this.unreadCountUpdate$.next()));
    this.hubConnection.on('UserTyping', (data) => this.zone.run(() => this.userTyping$.next(data)));
    this.hubConnection.on('UserStoppedTyping', (data) => this.zone.run(() => this.userStoppedTyping$.next(data)));
    this.hubConnection.on('UserOnline', (userId) => this.zone.run(() => this.userOnline$.next(userId)));
    this.hubConnection.on('UserOffline', (userId) => this.zone.run(() => this.userOffline$.next(userId)));
    this.hubConnection.on('ApplicationStatusChanged', (data) => this.zone.run(() => this.applicationStatusChanged$.next(data)));
    this.hubConnection.on('NewApplication', (data) => this.zone.run(() => this.newApplication$.next(data)));
    this.hubConnection.on('NewNotification', () => this.zone.run(() => this.newNotification$.next()));

    this.hubConnection.start().then(() => {
      console.log('[SignalR] Connected');
    }).catch((err) => {
      console.error('[SignalR] Connection failed:', err);
    });
  }

  stop(): void {
    this.hubConnection?.stop();
    this.hubConnection = null;
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
