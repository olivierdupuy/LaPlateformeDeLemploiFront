import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { JobOffer, JobOfferCreate } from '../models/job-offer.model';
import { Stats } from '../models/stats.model';
import { PagedResult } from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class JobOfferService {
  private readonly apiUrl = '/api/joboffers';

  constructor(private http: HttpClient) {}

  getAll(filters?: {
    search?: string;
    categoryId?: number;
    contractType?: string;
    location?: string;
    isRemote?: boolean;
    page?: number;
    pageSize?: number;
  }): Observable<PagedResult<JobOffer>> {
    let params = new HttpParams();
    if (filters) {
      if (filters.search) params = params.set('search', filters.search);
      if (filters.categoryId) params = params.set('categoryId', filters.categoryId.toString());
      if (filters.contractType) params = params.set('contractType', filters.contractType);
      if (filters.location) params = params.set('location', filters.location);
      if (filters.isRemote !== undefined) params = params.set('isRemote', filters.isRemote.toString());
      if (filters.page) params = params.set('page', filters.page.toString());
      if (filters.pageSize) params = params.set('pageSize', filters.pageSize.toString());
    }
    return this.http.get<PagedResult<JobOffer>>(this.apiUrl, { params });
  }

  getById(id: number): Observable<JobOffer> {
    return this.http.get<JobOffer>(`${this.apiUrl}/${id}`);
  }

  create(job: JobOfferCreate): Observable<JobOffer> {
    return this.http.post<JobOffer>(this.apiUrl, job);
  }

  update(id: number, job: JobOfferCreate): Observable<JobOffer> {
    return this.http.put<JobOffer>(`${this.apiUrl}/${id}`, job);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getStats(): Observable<Stats> {
    return this.http.get<Stats>(`${this.apiUrl}/stats`);
  }
}
