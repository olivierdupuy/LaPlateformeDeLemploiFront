import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ResumeDto, ResumeSave } from '../models/resume.model';

@Injectable({ providedIn: 'root' })
export class ResumeService {
  constructor(private http: HttpClient) {}

  getMyResume(): Observable<ResumeDto | null> {
    return this.http.get<ResumeDto | null>('/api/resume');
  }

  getByUser(userId: number): Observable<ResumeDto> {
    return this.http.get<ResumeDto>(`/api/resume/user/${userId}`);
  }

  save(data: ResumeSave): Observable<ResumeDto> {
    return this.http.post<ResumeDto>('/api/resume', data);
  }

  delete(): Observable<void> {
    return this.http.delete<void>('/api/resume');
  }

  parseFile(file: File): Observable<ResumeSave> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ResumeSave>('/api/resume/parse', formData);
  }
}
