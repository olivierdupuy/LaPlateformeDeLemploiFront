import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CandidatePublicProfile } from '../models/auth.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class CandidateService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/candidates`;

  getAll(search?: string): Observable<CandidatePublicProfile[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    return this.http.get<CandidatePublicProfile[]>(this.apiUrl, { params });
  }

  getById(id: string): Observable<CandidatePublicProfile> {
    return this.http.get<CandidatePublicProfile>(`${this.apiUrl}/${id}`);
  }
}
