import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/admin`;

  /** Importer de vraies offres depuis les API publiques (Arbeitnow, Remotive, France Travail). */
  importJobs(): Observable<{ imported: number; message: string }> {
    return this.http.post<{ imported: number; message: string }>(`${environment.apiUrl}/import/jobs`, {});
  }

  // Activity Logs
  getActivityLogs(params?: { action?: string; entityType?: string; userId?: string; page?: number }): Observable<any> {
    let p = new HttpParams();
    if (params?.action) p = p.set('action', params.action);
    if (params?.entityType) p = p.set('entityType', params.entityType);
    if (params?.userId) p = p.set('userId', params.userId);
    if (params?.page) p = p.set('page', params.page.toString());
    return this.http.get<any>(`${this.api}/activity-logs`, { params: p });
  }

  getLogActions(): Observable<string[]> {
    return this.http.get<string[]>(`${this.api}/activity-logs/actions`);
  }

  // Moderation
  getModerationQueue(status?: string): Observable<any[]> {
    let p = new HttpParams();
    if (status) p = p.set('status', status);
    return this.http.get<any[]>(`${this.api}/moderation`, { params: p });
  }

  approveOffer(id: number): Observable<any> {
    return this.http.patch(`${this.api}/moderation/${id}/approve`, {});
  }

  rejectOffer(id: number, note?: string): Observable<any> {
    return this.http.patch(`${this.api}/moderation/${id}/reject`, { note });
  }

  toggleFeature(id: number): Observable<any> {
    return this.http.patch(`${this.api}/moderation/${id}/feature`, {});
  }

  // ── Explorateurs pagines ──
  // Le filtrage, le tri et la decoupe se font sur le serveur : la reponse
  // ne porte que la page demandee, plus les facettes de l'en-tete.
  private paged<T>(path: string, params: Record<string, string>): Observable<T> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params)) if (v) p = p.set(k, v);
    return this.http.get<T>(`${this.api}/${path}`, { params: p });
  }

  listOffers(params: Record<string, string>): Observable<any> {
    return this.paged('offers', params);
  }

  listApplications(params: Record<string, string>): Observable<any> {
    return this.paged('applications', params);
  }

  listInterviews(params: Record<string, string>): Observable<any> {
    return this.paged('interviews', params);
  }

  listUsers(params: Record<string, string>): Observable<any> {
    return this.paged('users', params);
  }

  // ── Pieces du dossier ──
  // Les onglets sont des listes : on enregistre ligne par ligne, au
  // geste, plutot que par un bouton global qui laisserait croire a un
  // etat d'ensemble a valider.
  majCandidature(id: number, data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.api}/applications/${id}`, data);
  }
  supprimerCandidature(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/applications/${id}`);
  }
  majRecherche(id: number, data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.api}/saved-searches/${id}`, data);
  }
  supprimerRecherche(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/saved-searches/${id}`);
  }
  majEntretien(id: number, data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.api}/interviews/${id}`, data);
  }
  supprimerEntretien(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/interviews/${id}`);
  }
  supprimerNote(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/job-notes/${id}`);
  }
  majSectionCv(id: number, data: Record<string, unknown>): Observable<any> {
    return this.http.patch(`${this.api}/cv-sections/${id}`, data);
  }
  supprimerSectionCv(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/cv-sections/${id}`);
  }

  // ── Dossier d'un utilisateur ──
  // Le panneau ouvre une fiche a onglets : tout arrive en une reponse
  // plutot qu'en sept appels declenches par la navigation entre onglets.
  getUserDossier(id: string): Observable<any> {
    return this.http.get<any>(`${this.api}/users/${id}/dossier`);
  }

  updateUser(id: string, data: Record<string, unknown>): Observable<any> {
    return this.http.put(`${this.api}/users/${id}`, data);
  }

  setUserPassword(id: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.api}/users/${id}/password`, { newPassword });
  }

  // ── Sécurité d'un compte ──
  // L'administration n'a ici que les pouvoirs qu'elle ne peut pas ne pas
  // avoir : déverrouiller quelqu'un que le compteur d'échecs a enfermé
  // dehors, et couper la double authentification de qui a perdu à la fois
  // son téléphone et ses codes de secours.

  deverrouiller(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/users/${id}/deverrouiller`, {});
  }

  desactiver2fa(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.api}/users/${id}/2fa/desactiver`, {});
  }

  fermerSessions(id: string): Observable<{ fermees: number; message: string }> {
    return this.http.post<{ fermees: number; message: string }>(`${this.api}/users/${id}/sessions/tout-fermer`, {});
  }

  // ── Expédition de courriel ──

  etatCourriel(): Observable<{ configure: boolean; etat: string; consequence: string }> {
    return this.http.get<{ configure: boolean; etat: string; consequence: string }>(`${this.api}/email/etat`);
  }

  essaiCourriel(email?: string): Observable<{ parti: boolean; message: string }> {
    return this.http.post<{ parti: boolean; message: string }>(`${this.api}/email/essai`, { email });
  }

  // Announcements
  getAnnouncements(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/announcements`);
  }

  createAnnouncement(data: any): Observable<any> {
    return this.http.post(`${this.api}/announcements`, data);
  }

  deleteAnnouncement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/announcements/${id}`);
  }

  toggleAnnouncement(id: number): Observable<any> {
    return this.http.patch(`${this.api}/announcements/${id}/toggle`, {});
  }

  getActiveBanners(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/banners`);
  }

  // Export CSV
  exportUsers(): Observable<Blob> {
    return this.http.get(`${this.api}/export/users`, { responseType: 'blob' });
  }

  exportOffers(): Observable<Blob> {
    return this.http.get(`${this.api}/export/offers`, { responseType: 'blob' });
  }

  exportApplications(): Observable<Blob> {
    return this.http.get(`${this.api}/export/applications`, { responseType: 'blob' });
  }

  // Settings
  getSettings(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/settings`);
  }

  updateSettings(settings: { key: string; value: string; type?: string; description?: string }[]): Observable<void> {
    return this.http.put<void>(`${this.api}/settings`, settings);
  }
}
