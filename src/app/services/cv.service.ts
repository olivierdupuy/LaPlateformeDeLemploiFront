import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CvSection, CvSectionCreate } from '../models/cv.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CvService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/cv`;

  getAll(): Observable<CvSection[]> {
    return this.http.get<CvSection[]>(this.apiUrl);
  }

  create(dto: CvSectionCreate): Observable<CvSection> {
    return this.http.post<CvSection>(this.apiUrl, dto);
  }

  createBatch(dtos: CvSectionCreate[]): Observable<CvSection[]> {
    return this.http.post<CvSection[]>(`${this.apiUrl}/batch`, dtos);
  }

  update(id: number, dto: Partial<CvSectionCreate>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  deleteAll(): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/all`);
  }

  generateWithAi(additionalContext?: string): Observable<CvSectionCreate[]> {
    return this.http.post<CvSectionCreate[]>(`${this.apiUrl}/generate-ai`, { additionalContext });
  }

  /** Analyse un CV et renvoie les sections extraites. */
  parseFile(file: File): Observable<ParsedCv> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ParsedCv>(`${this.apiUrl}/parse-file`, formData);
  }

  /** Analyse un CV et renvoie des champs de profil pré-remplis. */
  parseProfile(file: File): Observable<ProfileDraft> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ProfileDraft>(`${this.apiUrl}/parse-profile`, formData);
  }
}

export interface ParsedCv {
  sections: CvSectionCreate[];
  /** Le CV dépassait la longueur transmise au modèle : sa fin n'a pas été analysée. */
  truncated: boolean;
}

export interface ProfileDraft {
  title?: string;
  skills?: string;
  experienceYears?: number | null;
  education?: string;
  city?: string;
  bio?: string;
}
