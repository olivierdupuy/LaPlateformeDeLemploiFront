import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface SalaryRole {
  title: string;
  category?: string;
  avgAnnual: number;
  minAnnual: number;
  maxAnnual: number;
  count: number;
}

export interface SalaryBreakdown { label: string; avgAnnual: number; count: number; }

export interface SalaryEstimate {
  title: string;
  count: number;
  avgAnnual: number;
  minAnnual: number;
  medianAnnual: number;
  maxAnnual: number;
  byLocation: SalaryBreakdown[];
  byCompany: SalaryBreakdown[];
}

export interface SalaryContributionCreate {
  jobTitle: string;
  company?: string;
  location?: string;
  amountAnnual: number;
  contractType?: string;
  experienceLevel?: string;
}

@Injectable({ providedIn: 'root' })
export class SalaryService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/salaries`;

  getRoles(sector?: string, q?: string): Observable<{ roles: SalaryRole[] }> {
    let params = new HttpParams();
    if (sector) params = params.set('sector', sector);
    if (q) params = params.set('q', q);
    return this.http.get<{ roles: SalaryRole[] }>(`${this.base}/roles`, { params });
  }

  getEstimate(title: string): Observable<SalaryEstimate> {
    return this.http.get<SalaryEstimate>(`${this.base}/estimate`, { params: new HttpParams().set('title', title) });
  }

  contribute(dto: SalaryContributionCreate): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/contribute`, dto);
  }
}
