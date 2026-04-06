import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobPreferences, RecommendedJob } from '../models/preferences.model';

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  constructor(private http: HttpClient) {}

  getPreferences(): Observable<JobPreferences> {
    return this.http.get<JobPreferences>('/api/recommendations/preferences');
  }

  savePreferences(prefs: JobPreferences): Observable<JobPreferences> {
    return this.http.post<JobPreferences>('/api/recommendations/preferences', prefs);
  }

  getRecommendedJobs(limit: number = 12): Observable<RecommendedJob[]> {
    return this.http.get<RecommendedJob[]>(`/api/recommendations/jobs?limit=${limit}`);
  }

  hasPreferences(): Observable<{ hasPreferences: boolean }> {
    return this.http.get<{ hasPreferences: boolean }>('/api/recommendations/has-preferences');
  }
}
