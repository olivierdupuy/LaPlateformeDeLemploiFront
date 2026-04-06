import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, switchMap, tap } from 'rxjs';

export interface AppNotification {
  id: number;
  title: string;
  message: string;
  type: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private unreadCountSubject = new BehaviorSubject<number>(0);
  unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getAll(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>('/api/notifications');
  }

  refreshUnreadCount(): void {
    this.http.get<{ count: number }>('/api/notifications/unread-count').subscribe({
      next: r => this.unreadCountSubject.next(r.count),
      error: () => this.unreadCountSubject.next(0)
    });
  }

  markAsRead(id: number): Observable<any> {
    return this.http.put(`/api/notifications/${id}/read`, {}).pipe(
      tap(() => {
        const current = this.unreadCountSubject.value;
        if (current > 0) this.unreadCountSubject.next(current - 1);
      })
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put('/api/notifications/read-all', {}).pipe(
      tap(() => this.unreadCountSubject.next(0))
    );
  }

  delete(id: number): Observable<any> {
    return this.http.delete(`/api/notifications/${id}`);
  }

  startPolling(): void {
    interval(30000).pipe(
      switchMap(() => this.http.get<{ count: number }>('/api/notifications/unread-count'))
    ).subscribe({
      next: r => this.unreadCountSubject.next(r.count),
      error: () => {}
    });
  }
}
