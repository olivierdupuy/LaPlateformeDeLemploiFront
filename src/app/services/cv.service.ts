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

  parseFile(file: File): Observable<CvSectionCreate[]> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<CvSectionCreate[]>(`${this.apiUrl}/parse-file`, formData);
  }
}
