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

  /** Champ-piège, toujours vide chez une personne. Voir AntiRobot côté serveur. */
  siteWeb?: string;
  /** Millisecondes passées sur le formulaire. */
  msSaisie?: number;
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
  /**
   * La lettre en blocs, sérialisée. Absente sur les campagnes écrites
   * avant l'éditeur : celles-là s'ouvrent dans leur HTML, sans conversion
   * automatique — la découper à la machine abîmerait une mise en page
   * réglée à la main.
   */
  blocs?: string;
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

/**
 * Un bloc de la lettre.
 *
 * Le corps se saisissait en HTML brut dans un `textarea` : il fallait
 * écrire des tableaux et des styles en ligne de mémoire, le soir, et rien
 * ne permettait de mettre une offre dans la lettre d'un site d'emploi
 * autrement qu'en recopiant un intitulé et un lien.
 */
export interface BlocLettre {
  type: 'titre' | 'texte' | 'offres' | 'bouton' | 'separateur' | 'image';
  texte?: string;
  url?: string;
  alignement?: 'gauche' | 'centre';
  /** Une messagerie sur deux bloque les images : sans lui il ne reste rien. */
  alt?: string;
  offres?: BlocOffres;
}

/**
 * Le réglage d'un bloc d'offres.
 *
 * `abonne` est le mode qui distingue une lettre d'un site d'emploi d'un
 * publipostage : chaque destinataire reçoit les offres qui lui
 * correspondent, calculées à l'envoi depuis sa ville et ses centres
 * d'intérêt.
 */
export interface BlocOffres {
  source: 'choisies' | 'recherche' | 'abonne';
  /** Mode « choisies » : les offres piochées, dans l'ordre voulu. */
  ids?: number[];
  /** Mode « recherche » : la sélection décrite plutôt qu'énumérée. */
  metier?: string;
  lieu?: string;
  contrat?: string;
  rayonKm?: number;
  nombre: number;
  /** Ce qu'on fait quand la sélection ne ramène rien. */
  repli: 'region' | 'recentes' | 'masquer';
  titre?: string;
}

/** Une offre, telle que le sélecteur la montre. */
export interface OffreBreve {
  id: number;
  title: string;
  company: string;
  location: string;
  contractType: string;
  salary?: string;
  createdAt: string;
}

/** Un abonné dans la peau duquel l'aperçu peut se rendre. */
export interface Incarnation {
  id: number;
  email: string;
  firstName?: string;
  city?: string;
  categories?: string;
}

export interface BrouillonCampagne {
  subject: string;
  previewText?: string;
  bodyHtml: string;
  /** La lettre en blocs, sérialisée. Prend le pas sur `bodyHtml`. */
  blocs?: string;
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

  /**
   * L'aperçu, rendu dans la peau d'un abonné.
   *
   * `abonneId` n'est pas un détail : un bloc d'offres « pour chaque
   * abonné » ne montre rien sur un destinataire fictif, puisque c'est la
   * ville et les centres d'intérêt de quelqu'un de réel qui font la
   * sélection. Pouvoir changer d'abonné est le seul moyen de vérifier
   * qu'une lettre personnalisée tient debout pour plusieurs personnes.
   */
  apercu(b: BrouillonCampagne, abonneId?: number | null): Observable<{
    sujet: string; html: string; texte: string; rendu: string;
    lacunes: { champ: string; manquant: number; total: number }[];
    abonne: Incarnation;
    incarnations: Incarnation[];
  }> {
    const q = abonneId ? `?abonneId=${abonneId}` : '';
    return this.http.post<any>(`${this.admin}/campagnes/apercu${q}`, b);
  }

  /** Chercher des offres à mettre dans la lettre. */
  chercherOffres(q: string): Observable<OffreBreve[]> {
    return this.http.get<OffreBreve[]>(
      `${this.admin}/offres?q=${encodeURIComponent(q)}`);
  }

  /**
   * Relire une sélection déjà faite.
   *
   * Sans cet appel l'éditeur afficherait des identifiants nus, et une
   * offre retirée du catalogue depuis resterait dans la lettre sans que
   * personne le voie.
   */
  offresChoisies(ids: number[]): Observable<OffreBreve[]> {
    return this.http.get<OffreBreve[]>(`${this.admin}/offres?ids=${ids.join(',')}`);
  }

  /** Les familles de métiers, pour le bloc d'offres en mode « recherche ». */
  metiers(): Observable<string[]> {
    return this.http.get<string[]>(`${this.admin}/metiers`);
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
