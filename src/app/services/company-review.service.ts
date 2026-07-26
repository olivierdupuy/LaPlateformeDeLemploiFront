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

export interface CompanyAnswer { id: number; body: string; authorName?: string; createdAt: string; }
export interface CompanyQuestion { id: number; body: string; authorName?: string; createdAt: string; answers: CompanyAnswer[]; }

export interface CompanyProfile {
  company: string;
  foundedYear?: number | null;
  size?: string;
  industry?: string;
  headquarters?: string;
  website?: string;
  about?: string;
  jobCount: number;
}

@Injectable({ providedIn: 'root' })
export class CompanyReviewService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/companies`;
  private enc(c: string) { return encodeURIComponent(c); }

  getReviews(company: string): Observable<CompanyReviewSummary> {
    return this.http.get<CompanyReviewSummary>(`${this.base}/${this.enc(company)}/reviews`);
  }
  createReview(company: string, dto: CompanyReviewCreate): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${this.enc(company)}/reviews`, dto);
  }
  getRating(company: string): Observable<{ average: number; count: number }> {
    return this.http.get<{ average: number; count: number }>(`${this.base}/${this.enc(company)}/rating`);
  }
  getActivity(company: string): Observable<{ hires30d: number; responsive: boolean }> {
    return this.http.get<{ hires30d: number; responsive: boolean }>(`${this.base}/${this.enc(company)}/activity`);
  }

  // ── Q&A ──
  getQuestions(company: string): Observable<CompanyQuestion[]> {
    return this.http.get<CompanyQuestion[]>(`${this.base}/${this.enc(company)}/questions`);
  }
  askQuestion(company: string, body: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/${this.enc(company)}/questions`, { body });
  }
  answerQuestion(questionId: number, body: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.base}/questions/${questionId}/answers`, { body });
  }

  // ── Suivre ──
  getFollow(company: string): Observable<{ following: boolean; count: number }> {
    return this.http.get<{ following: boolean; count: number }>(`${this.base}/${this.enc(company)}/follow`);
  }
  toggleFollow(company: string): Observable<{ following: boolean; count: number }> {
    return this.http.post<{ following: boolean; count: number }>(`${this.base}/${this.enc(company)}/follow`, {});
  }

  // ── Fiche « À propos » ──
  getProfile(company: string): Observable<CompanyProfile> {
    return this.http.get<CompanyProfile>(`${this.base}/${this.enc(company)}/profile`);
  }
  saveProfile(company: string, dto: Partial<CompanyProfile>): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.base}/${this.enc(company)}/profile`, dto);
  }

  // ── Modération avis (admin) ──
  getAllReviewsAdmin(status?: string): Observable<any[]> {
    const url = `${this.base}/reviews/all${status ? '?status=' + status : ''}`;
    return this.http.get<any[]>(url);
  }
  setReviewStatus(id: number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.base}/reviews/${id}/status`, { body: status });
  }
}
