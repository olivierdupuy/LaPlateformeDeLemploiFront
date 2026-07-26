import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface JobEvent {
  id: number;
  title: string;
  description: string;
  type: string;
  startsAt: string;
  endsAt?: string;
  isOnline: boolean;
  location?: string;
  url?: string;
  organizer?: string;
  createdByUserId?: string;
}

export type JobEventCreate = Omit<JobEvent, 'id' | 'createdByUserId'>;

@Injectable({ providedIn: 'root' })
export class EventService {
  private http = inject(HttpClient);
  private base = `${environment.apiUrl}/events`;

  getAll(past = false): Observable<JobEvent[]> {
    return this.http.get<JobEvent[]>(this.base, { params: new HttpParams().set('past', past) });
  }
  create(dto: JobEventCreate): Observable<JobEvent> {
    return this.http.post<JobEvent>(this.base, dto);
  }
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
