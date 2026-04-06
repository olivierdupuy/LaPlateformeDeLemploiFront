import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApplicationDto, DashboardStats, FavoriteDto } from '../models/application.model';

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  constructor(private http: HttpClient) {}

  // Candidatures
  apply(jobOfferId: number, coverLetter?: string): Observable<ApplicationDto> {
    return this.http.post<ApplicationDto>('/api/applications', { jobOfferId, coverLetter });
  }

  getMyApplications(): Observable<ApplicationDto[]> {
    return this.http.get<ApplicationDto[]>('/api/applications/mine');
  }

  getReceivedApplications(): Observable<ApplicationDto[]> {
    return this.http.get<ApplicationDto[]>('/api/applications/received');
  }

  updateStatus(id: number, status: string): Observable<ApplicationDto> {
    return this.http.put<ApplicationDto>(`/api/applications/${id}/status`, { status });
  }

  hasApplied(jobOfferId: number): Observable<{ applied: boolean }> {
    return this.http.get<{ applied: boolean }>(`/api/applications/check/${jobOfferId}`);
  }

  deleteApplication(id: number): Observable<void> {
    return this.http.delete<void>(`/api/applications/${id}`);
  }

  updateNotes(id: number, notes: string | null): Observable<any> {
    return this.http.put(`/api/applications/${id}/notes`, { notes });
  }

  // Favoris
  toggleFavorite(jobOfferId: number): Observable<{ favorited: boolean }> {
    return this.http.post<{ favorited: boolean }>(`/api/favorites/${jobOfferId}`, {});
  }

  getMyFavorites(): Observable<FavoriteDto[]> {
    return this.http.get<FavoriteDto[]>('/api/favorites');
  }

  getFavoriteIds(): Observable<number[]> {
    return this.http.get<number[]>('/api/favorites/ids');
  }

  // Dashboard
  getDashboardStats(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>('/api/profile/dashboard');
  }

  // Profil
  updateProfile(data: { firstName: string; lastName: string; phone?: string; bio?: string; skills?: string }): Observable<any> {
    return this.http.put('/api/profile', data);
  }
}
