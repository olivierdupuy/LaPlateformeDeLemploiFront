import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface CompanyReview {
  id: number;
  overallRating: number;
  workLifeBalance: number;
  payBenefits: number;
  jobSecurity: number;
  management: number;
  culture: number;
  title: string;
  body?: string;
  jobTitle?: string;
  location?: string;
  authorName?: string;
  createdAt: string;
}

export interface CompanyReviewSummary {
  company: string;
  count: number;
  average: number;
  criteria: { workLifeBalance: number; payBenefits: number; jobSecurity: number; management: number; culture: number };
  distribution: Record<string, number>;
  reviews: CompanyReview[];
}

export interface CompanyReviewCreate {
  overallRating: number;
  workLifeBalance: number;
  payBenefits: number;
  jobSecurity: number;
  management: number;
  culture: number;
  title: string;
  body?: string;
  jobTitle?: string;
  location?: string;
}

@Injectable({ providedIn: 'root' })
export class CompanyReviewService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/companies`;

  getReviews(company: string): Observable<CompanyReviewSummary> {
    return this.http.get<CompanyReviewSummary>(`${this.base}/${encodeURIComponent(company)}/reviews`);
  }

  createReview(company: string, dto: CompanyReviewCreate): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${encodeURIComponent(company)}/reviews`, dto);
  }

  getRating(company: string): Observable<{ average: number; count: number }> {
    return this.http.get<{ average: number; count: number }>(`${this.base}/${encodeURIComponent(company)}/rating`);
  }
}
