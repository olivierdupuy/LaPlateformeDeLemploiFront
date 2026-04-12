import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOffer, JobStats, CompanyInfo, DetailedStats } from '../models/job-offer.model';
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
    sort?: string;
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
      if (filters.sort) params = params.set('sort', filters.sort);
    }
    return this.http.get<JobOffer[]>(this.apiUrl, { params });
  }

  getById(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/${id}`);
  }

  getCategories(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/categories`);
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

  getCompanies(): Observable<CompanyInfo[]> {
    return this.http.get<CompanyInfo[]>(`${this.apiUrl}/companies`);
  }

  getByCompany(name: string): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.apiUrl}/company/${encodeURIComponent(name)}`);
  }

  getMyOffers(): Observable<JobOffer[]> {
    return this.http.get<JobOffer[]>(`${this.apiUrl}/mine`);
  }

  renewOffer(id: number): Observable<JobOffer> {
    return this.http.patch<JobOffer>(`${this.apiUrl}/${id}/renew`, {});
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
