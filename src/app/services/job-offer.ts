import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOffer, JobStats, CompanyInfo, DetailedStats, JobReport } from '../models/job-offer.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class JobOfferService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/joboffers`;

  getAll(filters?: {
    search?: string;
    category?: string;
    contractType?: string;
    isRemote?: boolean;
    location?: string;
    salaryMin?: number;
    salaryMax?: number;
    experience?: string;
    education?: string;
    workSchedule?: string;
    languages?: string;
    benefits?: string;
    datePosted?: number;
    radius?: number;
    sort?: string;
    page?: number;
    pageSize?: number;
  }): Observable<JobOffer[]> {
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.category) params = params.set('category', filters.category);
      if (filters.contractType) params = params.set('contractType', filters.contractType);
      if (filters.isRemote !== undefined) params = params.set('isRemote', filters.isRemote.toString());
      if (filters.location) params = params.set('location', filters.location);
      if (filters.salaryMin) params = params.set('salaryMin', filters.salaryMin.toString());
      if (filters.salaryMax) params = params.set('salaryMax', filters.salaryMax.toString());
      if (filters.experience) params = params.set('experience', filters.experience);
      if (filters.education) params = params.set('education', filters.education);
      if (filters.workSchedule) params = params.set('workSchedule', filters.workSchedule);
      if (filters.languages) params = params.set('languages', filters.languages);
      if (filters.benefits) params = params.set('benefits', filters.benefits);
      if (filters.datePosted) params = params.set('datePosted', filters.datePosted.toString());
      if (filters.radius) params = params.set('radius', filters.radius.toString());
      if (filters.sort) params = params.set('sort', filters.sort);
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());
    }
    return this.http.get<JobOffer[]>(this.apiUrl, { params });
  }

  /** Autocompletion : suggestions de mots-cles ou de lieux. */
  suggest(q: string, type: 'keyword' | 'location' = 'keyword'): Observable<string[]> {
    const params = new HttpParams().set('q', q).set('type', type);
    return this.http.get<string[]>(`${this.apiUrl}/suggest`, { params });
  }

  /** Signaler une offre d'emploi. */
  report(id: number, payload: { reason: string; details?: string; reporterEmail?: string }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/report`, payload);
  }

  /** Admin : liste des signalements d'offres. */
  getReports(status?: string): Observable<JobReport[]> {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http.get<JobReport[]>(`${this.apiUrl}/reports`, { params });
  }

  /** Admin : mettre à jour le statut d'un signalement (Reviewed / Dismissed). */
  updateReport(reportId: number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/reports/${reportId}`, { reason: status });
  }

  getById(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
  }

  getFilterOptions(): Observable<{ experiences: string[]; educations: string[]; workSchedules: string[]; languages: string[] }> {
    return this.http.get<{ experiences: string[]; educations: string[]; workSchedules: string[]; languages: string[] }>(`${this.apiUrl}/filters`);
  }

  getStats(): Observable<JobStats> {
    return this.http.get<JobStats>(`${this.apiUrl}/stats`);
  }

  getDetailedStats(): Observable<DetailedStats> {
    return this.http.get<DetailedStats>(`${this.apiUrl}/stats/detailed`);
  }

  getAdminStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats/admin`);
  }

  isModerationRequired(): Observable<{ required: boolean }> {
    return this.http.get<{ required: boolean }>(`${this.apiUrl}/moderation-required`);
  }

  getBrowse(): Observable<{
    categories: { label: string; count: number }[];
    locations: { label: string; count: number }[];
    contractTypes: { label: string; count: number }[];
  }> {
    return this.http.get<any>(`${this.apiUrl}/browse`);
  }

  getCompanies(): Observable<CompanyInfo[]> {
    return this.http.get<CompanyInfo[]>(`${this.apiUrl}/companies`);
  }

  getByCompany(name: string): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.apiUrl}/company/${encodeURIComponent(name)}`);
  }

  getMyOffers(scope?: 'team'): Observable<JobOffer[]> {
    const params = scope ? new HttpParams().set('scope', scope) : undefined;
    return this.http.get<JobOffer[]>(`${this.apiUrl}/mine`, { params });
  }

  getTeamMembers(): Observable<{ company: string | null; members: { name: string; role: string; isMe: boolean; offerCount: number }[] }> {
    return this.http.get<any>(`${this.apiUrl}/team-members`);
  }

  renewOffer(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.apiUrl}/${id}/renew`, {});
  }

  /** Recruteur : sponsoriser / retirer la mise en avant de sa propre offre. */
  toggleFeature(id: number): Observable<{ isFeatured: boolean }> {
    return this.http.patch<{ isFeatured: boolean }>(`${this.apiUrl}/${id}/feature`, {});
  }

  /** Recruteur : statistiques d'une offre (vues, candidatures, conversion, statuts). */
  getOfferStats(id: number): Observable<{ views: number; applications: number; isFeatured: boolean; conversion: number; byStatus: { label: string; value: number }[]; appsByDay: { label: string; value: number }[] }> {
    return this.http.get<any>(`${this.apiUrl}/${id}/stats`);
  }

  create(job: Partial<JobOffer>): Observable<JobOffer> {
    return this.http.post<JobOffer>(this.apiUrl, job);
  }

  update(id: number, job: Partial<JobOffer>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, job);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
