import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Application } from '../models/job-offer.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/applications`;

  getAll(): Observable<Application[]> {
    return this.http.get<Application[]>(this.apiUrl);
  }

  getByJobOffer(jobOfferId: number): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/job/${jobOfferId}`);
  }

  trackMy(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/track`);
  }

  create(application: Partial<Application>): Observable<Application> {
    return this.http.post<Application>(this.apiUrl, application);
  }

  updateNotes(id: number, notes: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/notes`, { notes });
  }

  updateStatus(id: number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getRecruiterStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/recruiter`);
  }

  getCandidateStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/candidate`);
  }
}
