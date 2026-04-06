import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ConversationDto {
  id: number;
  otherUserId: number;
  otherUserName: string;
  otherUserRole: string;
  companyName: string | null;
  companyLogoUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

export interface MessageDto {
  id: number;
  senderId: number;
  senderName: string;
  content: string;
  sentAt: string;
  isRead: boolean;
  isMine: boolean;
}

@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly api = '/api/messages';

  constructor(private http: HttpClient) {}

  getConversations(): Observable<ConversationDto[]> {
    return this.http.get<ConversationDto[]>(this.api + '/conversations');
  }

  getMessages(conversationId: number): Observable<MessageDto[]> {
    return this.http.get<MessageDto[]>(`${this.api}/conversations/${conversationId}`);
  }

  sendMessage(recipientId: number, content: string): Observable<MessageDto> {
    return this.http.post<MessageDto>(this.api, { recipientId, content });
  }

  getUnreadCount(): Observable<number> {
    return this.http.get<number>(this.api + '/unread-count');
  }
}
