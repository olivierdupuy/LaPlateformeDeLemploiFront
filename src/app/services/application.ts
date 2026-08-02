import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Application } from '../models/job-offer.model';
import { environment } from '../../environments/environment';

/**
 * Ce qu'une candidature vaut face à l'offre à laquelle elle répond.
 *
 * `score` est nul pour une candidature déposée sans compte : il n'y a ni
 * compétences ni parcours à comparer, et c'est une absence d'information,
 * pas un mauvais dossier.
 */
export interface CorrespondanceCandidature {
  candidatureId: number;
  score: number | null;
  fiabilite: number;
  estimation: boolean;
  raisons: string[];
  reserves: string[];
}

@Injectable({ providedIn: 'root' })
export class ApplicationService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/applications`;

  getAll(): Observable<Application[]> {
    return this.http.get<Application[]>(this.apiUrl);
  }

  getByJobOffer(jobOfferId: number): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/job/${jobOfferId}`);
  }

  /**
   * Ce que chaque candidature vaut face à cette offre, et pourquoi.
   *
   * Rendu à part de la liste, qui reste un tableau d'`Application` : le
   * serveur peut ainsi être déployé avant le front sans casser la page.
   * Le serveur ne trie pas et n'écarte personne — il rend un score, ses
   * raisons et ses réserves, et le classement reste un geste du
   * recruteur.
   */
  getCorrespondances(jobOfferId: number): Observable<CorrespondanceCandidature[]> {
    return this.http.get<CorrespondanceCandidature[]>(
      `${this.apiUrl}/job/${jobOfferId}/correspondances`);
  }

  trackMy(): Observable<Application[]> {
    return this.http.get<Application[]>(`${this.apiUrl}/track`);
  }

  /** Ranger ou sortir des archives une candidature (candidat). */
  setArchived(id: number, isArchived: boolean): Observable<{ id: number; isArchived: boolean }> {
    return this.http.patch<{ id: number; isArchived: boolean }>(
      `${this.apiUrl}/${id}/archive`, { isArchived });
  }

  create(application: Partial<Application>): Observable<Application> {
    return this.http.post<Application>(this.apiUrl, application);
  }

  /** Candidat : relancer le recruteur sur une candidature en attente. */
  remind(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${id}/remind`, {});
  }

  updateNotes(id: number, notes: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/notes`, { notes });
  }

  updateStatus(id: number, status: string): Observable<void> {
    return this.http.patch<void>(`${this.apiUrl}/${id}/status`, { status });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  getRecruiterStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/recruiter`);
  }

  getCandidateStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats/candidate`);
  }
}
