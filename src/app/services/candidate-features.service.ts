import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CandidateFeaturesService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/candidate`;

  // Withdraw application
  withdrawApplication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/applications/${id}/withdraw`);
  }

  // Recommendations
  getRecommendations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/recommendations`);
  }

  // Notes
  getNote(jobId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/notes/${jobId}`);
  }

  saveNote(jobId: number, content: string): Observable<void> {
    return this.http.put<void>(`${this.api}/notes/${jobId}`, { content });
  }

  // Interview slots
  proposeSlots(interviewId: number, slots: string[], message?: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/interviews/${interviewId}/propose-slots`, { slots, message });
  }

  // Analytics
  getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.api}/analytics`);
  }

  // Alerts
  toggleSearchAlert(searchId: number): Observable<any> {
    return this.http.patch<any>(`${this.api}/saved-searches/${searchId}/toggle-alert`, {});
  }

  checkAlerts(): Observable<any> {
    return this.http.get<any>(`${this.api}/check-alerts`);
  }
}
