import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DemandeAbonnement {
  email: string;
  prenom?: string;
  nom?: string;
  ville?: string;
  categories?: string;
  /** D'où vient le geste : Footer, Page, Inscription. Sert aux statistiques. */
  source?: string;
}

export interface EtatAbonne {
  connu: boolean;
  /** Partiellement masquée : le lien a pu être transféré. */
  email?: string;
  desabonne?: boolean;
  confirme?: boolean;
}

/** Ce que la console sait de Brevo, sans jamais divulguer la clé. */
export interface EtatNewsletter {
  configure: boolean;
  etat: string;
  joignable: boolean;
  compte?: string | null;
  creditsRestants?: number | null;
  expediteur: string;
  expediteurValide: boolean;
  expediteursActifs: string[];
  abonnes: number;
  avertissements: string[];
  erreur?: string | null;
  consequence: string;
  champs: { cle: string; description: string }[];
}

export interface Abonne {
  id: number;
  email: string;
  firstName?: string;
  lastName?: string;
  status: string;
  source: string;
  city?: string;
  department?: string;
  categories?: string;
  createdAt: string;
  confirmedAt?: string;
  unsubscribedAt?: string;
  lastSentAt?: string;
  consentAt: string;
  consentIp?: string;
  consecutiveFailures: number;
  role?: string;
  membre: boolean;
}

export interface Campagne {
  id: number;
  subject: string;
  previewText?: string;
  bodyHtml?: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  recipients: number;
  delivered: number;
  failed: number;
  createdByName?: string;
  segmentRoles?: string;
  segmentCategories?: string;
  segmentCities?: string;
  segmentDepartments?: string;
  segmentActivity?: string;
  enCours?: boolean;
  restants?: number;
  echecs?: { email: string; error?: string }[];
}

export interface BrouillonCampagne {
  subject: string;
  previewText?: string;
  bodyHtml: string;
  roles?: string[];
  categories?: string[];
  cities?: string[];
  departments?: string[];
  activity?: string;
}

@Injectable({ providedIn: 'root' })
export class NewsletterService {
  private http = inject(HttpClient);
  private url = `${environment.apiUrl}/newsletter`;
  private admin = `${environment.apiUrl}/admin/newsletter`;

  // ── Public ──

  abonner(d: DemandeAbonnement): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.url}/abonner`, d);
  }

  confirmer(jeton: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.url}/confirmer`, { jeton });
  }

  desabonner(jeton: string, motif?: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.url}/desinscription`, { jeton, motif });
  }

  etatAbonne(jeton: string): Observable<EtatAbonne> {
    return this.http.get<EtatAbonne>(`${this.url}/etat`, { params: { jeton } });
  }

  // ── Console ──

  etat(): Observable<EtatNewsletter> {
    return this.http.get<EtatNewsletter>(`${this.admin}/etat`);
  }

  abonnes(p: Record<string, string> = {}): Observable<{
    items: Abonne[]; total: number; page: number; pageSize: number;
    facettes: { total: number; confirmes: number; enAttente: number;
                desabonnes: number; injoignables: number; membres: number };
  }> {
    return this.http.get<any>(`${this.admin}/abonnes`, { params: p });
  }

  /** L'export part en fichier : on récupère le binaire, pas du JSON. */
  exporter(): Observable<Blob> {
    return this.http.get(`${this.admin}/abonnes/export`, { responseType: 'blob' });
  }

  desabonnerDepuisLaConsole(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.admin}/abonnes/${id}/desabonner`, {});
  }

  campagnes(): Observable<Campagne[]> {
    return this.http.get<Campagne[]>(`${this.admin}/campagnes`);
  }

  campagne(id: number): Observable<Campagne> {
    return this.http.get<Campagne>(`${this.admin}/campagnes/${id}`);
  }

  creer(b: BrouillonCampagne): Observable<{ id: number }> {
    return this.http.post<{ id: number }>(`${this.admin}/campagnes`, b);
  }

  enregistrer(id: number, b: BrouillonCampagne): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.admin}/campagnes/${id}`, b);
  }

  supprimer(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.admin}/campagnes/${id}`);
  }

  /** Combien recevront, avec ce ciblage. Appelé à chaque changement de segment. */
  compter(b: Partial<BrouillonCampagne>): Observable<{ destinataires: number; message: string }> {
    return this.http.post<{ destinataires: number; message: string }>(
      `${this.admin}/campagnes/destinataires`, b);
  }

  apercu(b: BrouillonCampagne): Observable<{
    sujet: string; html: string; texte: string; rendu: string;
    lacunes: { champ: string; manquant: number; total: number }[];
  }> {
    return this.http.post<any>(`${this.admin}/campagnes/apercu`, b);
  }

  essai(id: number, email?: string): Observable<{ parti: boolean; message: string }> {
    return this.http.post<{ parti: boolean; message: string }>(
      `${this.admin}/campagnes/${id}/essai`, { email });
  }

  envoyer(id: number): Observable<{ message: string; destinataires: number }> {
    return this.http.post<{ message: string; destinataires: number }>(
      `${this.admin}/campagnes/${id}/envoyer`, {});
  }

  arreter(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.admin}/campagnes/${id}/arreter`, {});
  }
}
