import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeneratedJobOffer {
  title: string;
  description: string;
  salaryMin: number | null;
  salaryMax: number | null;
  suggestedSkills: string[];
}

export interface CandidateScore {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
  recommendationLabel: string;
}

export interface GeneratedEmail {
  subject: string;
  body: string;
}

@Injectable({ providedIn: 'root' })
export class AIService {
  constructor(private http: HttpClient) {}

  generateJob(title: string, keywords?: string, contractType?: string): Observable<GeneratedJobOffer> {
    return this.http.post<GeneratedJobOffer>('/api/ai/generate-job', { title, keywords, contractType });
  }

  scoreCandidate(applicationId: number): Observable<CandidateScore> {
    return this.http.post<CandidateScore>('/api/ai/score-candidate', { applicationId });
  }

  generateEmail(applicationId: number, type: string, additionalInfo?: string): Observable<GeneratedEmail> {
    return this.http.post<GeneratedEmail>('/api/ai/generate-email', { applicationId, type, additionalInfo });
  }
}
