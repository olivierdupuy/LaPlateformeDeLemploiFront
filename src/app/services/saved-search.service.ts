import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { SavedSearch } from '../models/job-offer.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SavedSearchService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/savedsearches`;

  getAll(): Observable<SavedSearch[]> {
    return this.http.get<SavedSearch[]>(this.apiUrl);
  }

  create(data: Partial<SavedSearch>): Observable<SavedSearch> {
    return this.http.post<SavedSearch>(this.apiUrl, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
