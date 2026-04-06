import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';

export interface RealTimeMessage {
  conversationId: number;
  senderId: number;
  content: string;
  sentAt: string;
}

@Injectable({ providedIn: 'root' })
export class SignalRService implements OnDestroy {
  private connection: signalR.HubConnection | null = null;

  messageReceived$ = new Subject<RealTimeMessage>();
  userTyping$ = new Subject<{ conversationId: number; userId: string }>();
  userStoppedTyping$ = new Subject<{ conversationId: number; userId: string }>();

  start(token: string): void {
    if (this.connection) return;

    const hubUrl = environment.apiUrl ? `${environment.apiUrl}/hubs/chat` : '/hubs/chat';
    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, { accessTokenFactory: () => token })
      .withAutomaticReconnect()
      .build();

    this.connection.on('ReceiveMessage', (msg: RealTimeMessage) => {
      this.messageReceived$.next(msg);
    });

    this.connection.on('UserTyping', (data: any) => {
      this.userTyping$.next(data);
    });

    this.connection.on('UserStoppedTyping', (data: any) => {
      this.userStoppedTyping$.next(data);
    });

    this.connection.start().catch(() => {});
  }

  stop(): void {
    this.connection?.stop();
    this.connection = null;
  }

  joinConversation(conversationId: number): void {
    this.connection?.invoke('JoinConversation', conversationId).catch(() => {});
  }

  leaveConversation(conversationId: number): void {
    this.connection?.invoke('LeaveConversation', conversationId).catch(() => {});
  }

  sendMessage(conversationId: number, content: string): void {
    this.connection?.invoke('SendMessage', conversationId, content).catch(() => {});
  }

  startTyping(conversationId: number): void {
    this.connection?.invoke('StartTyping', conversationId).catch(() => {});
  }

  stopTyping(conversationId: number): void {
    this.connection?.invoke('StopTyping', conversationId).catch(() => {});
  }

  ngOnDestroy(): void {
    this.stop();
  }
}
