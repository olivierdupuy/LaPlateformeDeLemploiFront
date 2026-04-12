import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { InterviewItem } from '../models/job-offer.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InterviewService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/interviews`;

  getAll(): Observable<InterviewItem[]> {
    return this.http.get<InterviewItem[]>(this.apiUrl);
  }

  create(data: { applicationId: number; proposedAt: string; location?: string; notes?: string; duration?: number; type?: string; interviewerName?: string }): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateStatus(id: number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
