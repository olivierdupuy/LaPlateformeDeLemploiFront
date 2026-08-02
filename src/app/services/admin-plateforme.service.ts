import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * La plateforme vue de la console : accès techniques, argent, catalogue.
 *
 * Trois domaines que le serveur savait déjà servir et qu'aucun écran ne
 * montrait. Deux d'entre eux existaient côté recruteur — le serveur
 * répondait, mais sur le compte de celui qui demandait. Le troisième,
 * l'import, était réservé aux administrateurs depuis le début et n'était
 * appelé par rien.
 */

// ══════════════════════════════
//  Intégrations
// ══════════════════════════════

export interface CleApiAdmin {
  id: number;
  nom: string;
  prefixe: string;
  portees: string[];
  creeLe: string;
  derniereUtilisation?: string | null;
  revoqueLe?: string | null;
  proprietaire: string;
  proprietaireNom: string;
  entreprise?: string | null;
  role: string;
  revoquee: boolean;
  /** Plus appelée depuis 90 jours : personne ne surveille sa fuite. */
  dormante: boolean;
  jamaisUtilisee: boolean;
}

export interface WebhookAdmin {
  id: number;
  url: string;
  evenements: string[];
  actif: boolean;
  echecsConsecutifs: number;
  creeLe: string;
  derniereLivraison?: string | null;
  derniereErreur?: string | null;
  proprietaire: string;
  entreprise?: string | null;
  /** Éteint par la machine après trop d'échecs — une panne, pas un choix. */
  tombe: boolean;
}

export interface LivraisonWebhook {
  id: number;
  evenement: string;
  codeReponse?: number | null;
  erreur?: string | null;
  tentatives: number;
  creeLe: string;
  livreLe?: string | null;
  livree: boolean;
}

/** Une destination et ce qui n'y passe pas. Groupé côté serveur : une
 *  liste d'offres mélangées ne dit pas d'où vient la panne. */
export interface DestinationEnPeine {
  destination: string;
  enEchec: number;
  enAttente: number;
  dernierMotif?: string | null;
}

export interface DiffusionAdmin {
  id: number;
  jobOfferId: number;
  destination: string;
  statut: string;
  motif?: string | null;
  tentatives: number;
  demandeeLe: string;
  offre?: string | null;
}

// ══════════════════════════════
//  Finances
// ══════════════════════════════

export interface ResumeFinances {
  recettes: { mois: string; ttcCentimes: number; htCentimes: number }[];
  parFormule: { cle: string; nom: string; prixMensuelCentimes: number; nombre: number }[];
  /** Ce que les abonnements actifs rapporteront le mois prochain si personne ne part. */
  recurrentMensuelCentimes: number;
  abonnementsActifs: number;
  abonnementsImpayes: number;
  echeancesProches: number;
  facturesImpayees: number;
  misesEnAvantActives: number;
}

export interface AbonnementAdmin {
  id: number;
  formule: string;
  formuleNom: string;
  prixMensuelCentimes: number;
  statut: string;
  debutLe: string;
  finLe?: string | null;
  entreprise?: string | null;
  compte: string;
  nom: string;
  expireBientot: boolean;
  expire: boolean;
}

export interface FactureAdmin {
  id: number;
  numero: string;
  libelle: string;
  statut: string;
  emiseLe: string;
  payeeLe?: string | null;
  montantHtCentimes: number;
  tvaCentimes: number;
  montantTtcCentimes: number;
  raisonSociale?: string | null;
  numeroTva?: string | null;
  referenceExterne?: string | null;
  compte: string;
  nom: string;
  impayee: boolean;
  joursDepuisEmission: number;
}

export interface MiseEnAvantAdmin {
  id: number;
  jobOfferId: number;
  debutLe: string;
  finLe: string;
  montantCentimes: number;
  origine: string;
  offre: string;
  entreprise: string;
  compte: string;
  encours: boolean;
}

// ══════════════════════════════
//  Catalogue
// ══════════════════════════════

/** Une source d'import, telle que le diagnostic la rend. Forme libre côté serveur. */
export interface SourceImport {
  configured: boolean;
  status?: number;
  results?: number;
  error?: string | null;
}

/**
 * Le comptage des doublons, tel que le serveur le rend.
 *
 * Les noms sont ceux du serveur et non ceux qu'on aurait choisis :
 * `importedOffers`, `atRisk.favourites`. Les renommer côté front
 * demanderait une correspondance de plus à tenir à jour, pour rien.
 *
 * `atRisk` compte ce qu'une purge emporterait en cascade. Ces tables
 * sont en suppression en cascade : le dire avant vaut mieux que de le
 * découvrir après.
 */
export interface Doublons {
  totalOffers: number;
  importedOffers: number;
  distinctExternalIds: number;
  duplicatedGroups: number;
  /** Les exemplaires en trop : ce que la purge supprimerait. */
  surplusRows: number;
  atRisk: { applications: number; favourites: number; reports: number };
  sample: { externalId: string; copies: number; keepId: number; ids: number[] }[];
}

@Injectable({ providedIn: 'root' })
export class AdminPlateformeService {
  private http = inject(HttpClient);
  private integrations = `${environment.apiUrl}/admin/integrations`;
  private finances = `${environment.apiUrl}/admin/finances`;
  private importation = `${environment.apiUrl}/import`;

  // ── Intégrations ──

  cles(): Observable<{ cles: CleApiAdmin[]; actives: number; dormantes: number; revoquees: number }> {
    return this.http.get<{ cles: CleApiAdmin[]; actives: number; dormantes: number; revoquees: number }>(
      `${this.integrations}/cles`);
  }

  /** Marque la clé révoquée. Elle n'est jamais supprimée : les journaux la nomment. */
  revoquerCle(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.integrations}/cles/${id}`);
  }

  webhooks(): Observable<{ webhooks: WebhookAdmin[]; actifs: number; tombes: number }> {
    return this.http.get<{ webhooks: WebhookAdmin[]; actifs: number; tombes: number }>(
      `${this.integrations}/webhooks`);
  }

  livraisons(id: number): Observable<LivraisonWebhook[]> {
    return this.http.get<LivraisonWebhook[]>(`${this.integrations}/webhooks/${id}/livraisons`);
  }

  reactiverWebhook(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.integrations}/webhooks/${id}/reactiver`, {});
  }

  diffusions(): Observable<{ lignes: DiffusionAdmin[]; parDestination: DestinationEnPeine[] }> {
    return this.http.get<{ lignes: DiffusionAdmin[]; parDestination: DestinationEnPeine[] }>(
      `${this.integrations}/diffusions`);
  }

  // ── Finances ──

  resumeFinances(): Observable<ResumeFinances> {
    return this.http.get<ResumeFinances>(`${this.finances}/resume`);
  }

  abonnements(): Observable<AbonnementAdmin[]> {
    return this.http.get<AbonnementAdmin[]>(`${this.finances}/abonnements`);
  }

  factures(statut?: string): Observable<FactureAdmin[]> {
    const q = statut ? `?statut=${encodeURIComponent(statut)}` : '';
    return this.http.get<FactureAdmin[]>(`${this.finances}/factures${q}`);
  }

  /** Un courriel, et rien d'autre : la console ne prélève jamais. */
  relancerFacture(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.finances}/factures/${id}/relance`, {});
  }

  /** Enregistre un règlement reçu ailleurs — un virement, typiquement. */
  marquerPayee(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.finances}/factures/${id}/payee`, {});
  }

  misesEnAvant(): Observable<MiseEnAvantAdmin[]> {
    return this.http.get<MiseEnAvantAdmin[]>(`${this.finances}/mises-en-avant`);
  }

  // ── Catalogue ──

  diagnostics(): Observable<Record<string, SourceImport>> {
    return this.http.get<Record<string, SourceImport>>(`${this.importation}/diagnostics`);
  }

  /** Répond 409 si un import tourne déjà — le message le dit. */
  lancerImport(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.importation}/jobs`, {});
  }

  doublons(): Observable<Doublons> {
    return this.http.get<Doublons>(`${this.importation}/duplicates`);
  }

  /**
   * Purge des doublons.
   *
   * `appliquer` à faux par défaut, et c'est le serveur qui l'impose :
   * supprimer la moitié d'un catalogue ne doit pas tenir à une faute de
   * frappe. L'écran montre d'abord la simulation.
   */
  purgerDoublons(appliquer: boolean): Observable<Record<string, unknown>> {
    return this.http.post<Record<string, unknown>>(
      `${this.importation}/duplicates/purge?apply=${appliquer}`, {});
  }

  reanalyserSalaires(): Observable<{ updated: number; message: string }> {
    return this.http.post<{ updated: number; message: string }>(
      `${this.importation}/reparse-salaries`, {});
  }
}
