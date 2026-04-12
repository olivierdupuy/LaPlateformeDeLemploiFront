import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Conversation, ChatMessage } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MessageService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/messages`;

  conversations = signal<Conversation[]>([]);
  unreadCount = signal(0);

  loadConversations() {
    this.http.get<Conversation[]>(`${this.apiUrl}/conversations`).subscribe({
      next: (c) => this.conversations.set(c),
    });
  }

  getMessages(applicationId: number): Observable<ChatMessage[]> {
    return this.http.get<ChatMessage[]>(`${this.apiUrl}/conversation/${applicationId}`);
  }

  send(applicationId: number, content: string): Observable<any> {
    return this.http.post(this.apiUrl, { applicationId, content });
  }

  markAsRead(applicationId: number): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/conversation/${applicationId}/read`, {});
  }

  loadUnreadCount() {
    this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`).subscribe({
      next: (r) => this.unreadCount.set(r.count),
    });
  }
}
