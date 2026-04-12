import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  // Activity Logs
  getActivityLogs(params?: { action?: string; entityType?: string; userId?: string; page?: number }): Observable<any> {
    let p = new HttpParams();
    if (params?.action) p = p.set('action', params.action);
    if (params?.entityType) p = p.set('entityType', params.entityType);
    if (params?.userId) p = p.set('userId', params.userId);
    if (params?.page) p = p.set('page', params.page.toString());
    return this.http.get<any>(`${this.api}/activity-logs`, { params: p });
  }

  getLogActions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/activity-logs/actions`);
  }

  // Moderation
  getModerationQueue(status?: string): Observable<any[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return this.http.get<any[]>(`${this.api}/moderation`, { params: p });
  }

  approveOffer(id: number): Observable<any> {
    return this.http.patch(`${this.api}/moderation/${id}/approve`, {});
  }

  rejectOffer(id: number, note?: string): Observable<any> {
    return this.http.patch(`${this.api}/moderation/${id}/reject`, { note });
  }

  toggleFeature(id: number): Observable<any> {
    return this.http.patch(`${this.api}/moderation/${id}/feature`, {});
  }

  // Announcements
  getAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/announcements`);
  }

  createAnnouncement(data: any): Observable<any> {
    return this.http.post(`${this.api}/announcements`, data);
  }

  deleteAnnouncement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/announcements/${id}`);
  }

  toggleAnnouncement(id: number): Observable<any> {
    return this.http.patch(`${this.api}/announcements/${id}/toggle`, {});
  }

  getActiveBanners(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/banners`);
  }

  // Export CSV
  exportUsers(): Observable<Blob> {
    return this.http.get(`${this.api}/export/users`, { responseType: 'blob' });
  }

  exportOffers(): Observable<Blob> {
    return this.http.get(`${this.api}/export/offers`, { responseType: 'blob' });
  }

  exportApplications(): Observable<Blob> {
    return this.http.get(`${this.api}/export/applications`, { responseType: 'blob' });
  }

  // Settings
  getSettings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/settings`);
  }

  updateSettings(settings: { key: string; value: string; type?: string; description?: string }[]): Observable<void> {
    return this.http.put<void>(`${this.api}/settings`, settings);
  }
}
