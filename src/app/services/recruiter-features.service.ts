import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class RecruiterFeaturesService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/recruiter`;

  duplicateOffer(id: number): Observable<any> {
    return this.http.post(`${this.api}/offers/${id}/duplicate`, {});
  }

  /**
   * Les notes d'équipe sur une candidature.
   *
   * Distinctes de « recruiterNotes », qui est un champ unique : le second
   * qui y écrivait effaçait le premier sans que personne ne le voie.
   * Celles-ci s'empilent et portent leur auteur. Elles ne sortent jamais
   * côté candidat.
   */
  notesEquipe(applicationId: number) {
    return this.http.get<{ id: number; auteurNom: string; contenu: string; creeLe: string; aMoi: boolean }[]>(
      `${this.api}/applications/${applicationId}/notes`);
  }

  ajouterNoteEquipe(applicationId: number, contenu: string) {
    return this.http.post<{ id: number; auteurNom: string; contenu: string; creeLe: string; aMoi: boolean }>(
      `${this.api}/applications/${applicationId}/notes`, { contenu });
  }

  retirerNoteEquipe(applicationId: number, noteId: number) {
    return this.http.delete<void>(`${this.api}/applications/${applicationId}/notes/${noteId}`);
  }

  /** Inviter un profil du vivier à postuler sur une offre. */
  inviter(jobOfferId: number, candidatId: string, message?: string) {
    return this.http.post<{ id: number; envoyeeLe: string }>(
      `${this.api}/invitations`, { jobOfferId, candidatId, message });
  }

  /** Les invitations de l'équipe, et ce qu'elles sont devenues. */
  invitationsEnvoyees() {
    return this.http.get<{ id: number; jobOfferId: number; poste: string; candidat: string; candidatId: string; envoyeeLe: string; vueLe: string | null; reponse: string | null }[]>(
      `${this.api}/invitations`);
  }

  searchCandidates(filters?: { search?: string; skills?: string; city?: string; minExperience?: number; maxExperience?: number; education?: string; disponible?: string; sort?: string }): Observable<any[]> {
    let p = new HttpParams();
    if (filters) {
      if (filters.search) p = p.set('search', filters.search);
      if (filters.skills) p = p.set('skills', filters.skills);
      if (filters.city) p = p.set('city', filters.city);
      if (filters.minExperience) p = p.set('minExperience', filters.minExperience.toString());
      if (filters.maxExperience) p = p.set('maxExperience', filters.maxExperience.toString());
      if (filters.education) p = p.set('education', filters.education);
      if (filters.sort) p = p.set('sort', filters.sort);
    }
    return this.http.get<any[]>(`${this.api}/candidates/search`, { params: p });
  }

  getTemplates(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/templates`);
  }

  createTemplate(data: { name: string; content: string; category?: string }): Observable<any> {
    return this.http.post(`${this.api}/templates`, data);
  }

  updateTemplate(id: number, data: { name: string; content: string; category?: string }): Observable<void> {
    return this.http.put<void>(`${this.api}/templates/${id}`, data);
  }

  deleteTemplate(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/templates/${id}`);
  }

  getOfferStats(id: number): Observable<any> {
    return this.http.get(`${this.api}/offers/${id}/stats`);
  }

  bulkUpdateStatus(ids: number[], status: string): Observable<any> {
    return this.http.patch(`${this.api}/applications/bulk-status`, { ids, status });
  }
}
