import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { EtatDuService } from './admin.service';

/**
 * Les services ajoutes par la professionnalisation : exploitation,
 * conformite, facturation, integrations.
 *
 * Rassembles ici plutot qu'eclates en quatre fichiers d'une dizaine de
 * lignes chacun. Ce sont des appels sans logique — ils traduisent une
 * URL, rien de plus — et les separer n'aurait produit que des fichiers
 * a ouvrir.
 */

// ── Exploitation ──

export interface ErreurNavigateur {
  id: number;
  message: string;
  pile?: string;
  chemin?: string;
  navigateur?: string;
  occurrences: number;
  premiereVue: string;
  derniereVue: string;
  traitee: boolean;
}

export interface FraicheurCatalogue {
  total: number;
  parSource: {
    source: string;
    nombre: number;
    plusRecente: string;
    plusAncienne: string;
    ageMoyenJours: number;
  }[];
  ageMedianJours: number | null;
  bientotExpirees: number;
  enModeration: number;
  suspectes: {
    id: number;
    title: string;
    company: string;
    scoreFraude: number;
    motifFraude: string;
    moderationStatus: string;
  }[];
  doublonsPotentiels: number;
}

// ── Conformite ──

export interface PreferencesCourriel {
  email: string;
  alertesOffres: boolean;
  suiviCandidatures: boolean;
  messages: boolean;
  entretiens: boolean;
  lettreInformation: boolean;
  actualites: boolean;
  toutRefuse: boolean;
  incontournables: string[];
}

export interface MotifSignalement {
  cle: string;
  libelle: string;
}

export interface SuiviSignalement {
  reference: string;
  statut: string;
  creeLe: string;
  traiteLe?: string;
  motif: string;
  decision?: string;
  mesurePrise?: string;
}

/** Un dossier vu de l'administration : tout, y compris l'exposé. */
export interface SignalementAdmin {
  id: number;
  reference: string;
  typeContenu: string;
  contenuId?: string;
  url?: string;
  motif: string;
  explication: string;
  emailDeclarant?: string;
  declareBonneFoi: boolean;
  statut: string;
  decision?: string;
  mesurePrise?: string;
  creeLe: string;
  traiteLe?: string;
}

export interface RetourCourriel {
  id: number;
  email: string;
  type: string;
  motif?: string;
  occurrences: number;
  bloque: boolean;
  premierLe: string;
  dernierLe: string;
}

// ── Facturation ──

export interface Formule {
  cle: string;
  nom: string;
  prixMensuelCentimes: number;
  offresActives: number;
  accesVivier: boolean;
  misesEnAvantIncluses: number;
  arguments: string[];
}

export interface MonCompte {
  formule: { cle: string; nom: string; prixMensuelCentimes: number };
  offres: { utilisees: number; quota: number; peutPublier: boolean; motif?: string };
  misesEnAvant: {
    incluses: number;
    restantes: number;
    prixUnitaireCentimes: number;
    dureeJours: number;
  };
  abonnement?: { debutLe: string; finLe?: string; statut: string } | null;
  paiementDisponible: boolean;
}

export interface Recettes {
  totalHtCentimes: number;
  moisHtCentimes: number;
  nombreFactures: number;
  abonnesActifs: number;
  parFormule: { formule: string; nombre: number }[];
  dernieres: Facture[];
}

export interface Facture {
  id: number;
  numero: string;
  libelle: string;
  montantHtCentimes: number;
  tvaCentimes: number;
  montantTtcCentimes: number;
  statut: string;
  emiseLe: string;
}

// ── Integrations ──

export interface CleApi {
  id: number;
  nom: string;
  prefixe: string;
  portees: string;
  creeLe: string;
  derniereUtilisation?: string;
  revoquee: boolean;
}

export interface WebhookAbonne {
  id: number;
  url: string;
  evenements: string;
  actif: boolean;
  creeLe: string;
  derniereLivraison?: string;
  derniereErreur?: string;
  echecsConsecutifs: number;
}

/** Un partenaire vers qui l'on sait pousser une offre. */
export interface DestinationDiffusion {
  cle: string;
  nom: string;
  /** Ce que le recruteur y gagne, en une phrase. */
  apport: string;
  configuree: boolean;
  /** Ce qu'il manque pour l'ouvrir. Nul si elle est prête. */
  manque: string | null;
}

/** L'état d'une offre chez un partenaire. */
export interface Diffusion {
  id: number;
  jobOfferId: number;
  destination: string;
  /** « en_attente », « diffusee », « echec », « retiree ». */
  statut: string;
  referenceExterne: string | null;
  urlExterne: string | null;
  /** Le motif du dernier échec, à montrer tel quel au recruteur. */
  motif: string | null;
  demandeeLe: string;
  diffuseeLe: string | null;
  retireeLe: string | null;
  tentatives: number;
}

@Injectable({ providedIn: 'root' })
export class PlateformeProService {
  private http = inject(HttpClient);
  private api = environment.apiUrl;

  // ── Exploitation ──

  erreursNavigateur(traitees = false): Observable<ErreurNavigateur[]> {
    return this.http.get<ErreurNavigateur[]>(
      `${this.api}/journal/erreurs-navigateur?traitees=${traitees}`,
    );
  }

  classerErreur(id: number, traitee = true): Observable<void> {
    return this.http.patch<void>(`${this.api}/journal/erreurs-navigateur/${id}`, { traitee });
  }

  /**
   * L'état détaillé du service.
   *
   * Typé. Il rendait « unknown », et l'écran d'exploitation en était
   * réduit à parcourir la réponse à l'aveugle et à sérialiser en JSON
   * ce qu'il ne savait pas afficher — c'est-à-dire les contrôles et les
   * tâches, soit tout ce qui a de l'intérêt.
   */
  sante(): Observable<EtatDuService> {
    return this.http.get<EtatDuService>(`${this.api}/sante/detail`);
  }

  catalogue(): Observable<FraicheurCatalogue> {
    return this.http.get<FraicheurCatalogue>(`${this.api}/journal/catalogue`);
  }

  // ── Preferences de courriel ──

  preferences(jeton?: string): Observable<PreferencesCourriel> {
    return jeton
      ? this.http.get<PreferencesCourriel>(`${this.api}/preferences-courriel/${jeton}`)
      : this.http.get<PreferencesCourriel>(`${this.api}/preferences-courriel`);
  }

  enregistrerPreferences(
    valeurs: Partial<PreferencesCourriel>,
    jeton?: string,
  ): Observable<{ message: string }> {
    const url = jeton ? `${this.api}/preferences-courriel/${jeton}` : `${this.api}/preferences-courriel`;
    return this.http.put<{ message: string }>(url, valeurs);
  }

  // ── Signalement DSA ──

  motifsSignalement(): Observable<MotifSignalement[]> {
    return this.http.get<MotifSignalement[]>(`${this.api}/signalements/motifs`);
  }

  signaler(charge: Record<string, unknown>): Observable<{ reference: string; message: string }> {
    return this.http.post<{ reference: string; message: string }>(`${this.api}/signalements`, charge);
  }

  suivreSignalement(reference: string): Observable<SuiviSignalement> {
    return this.http.get<SuiviSignalement>(`${this.api}/signalements/${reference}`);
  }

  /** Administration : la file des signalements à instruire. */
  signalements(statut?: string): Observable<SignalementAdmin[]> {
    const q = statut ? `?statut=${encodeURIComponent(statut)}` : '';
    return this.http.get<SignalementAdmin[]>(`${this.api}/signalements${q}`);
  }

  deciderSignalement(
    id: number,
    decision: { statut: string; decision: string; mesurePrise?: string },
  ): Observable<void> {
    return this.http.patch<void>(`${this.api}/signalements/${id}`, decision);
  }

  /** Administration : les adresses qu'on a cessé de servir. */
  retoursCourriel(): Observable<RetourCourriel[]> {
    return this.http.get<RetourCourriel[]>(`${this.api}/preferences-courriel/retours`);
  }

  /** Rouvre une adresse bloquée à tort. */
  debloquerAdresse(id: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.api}/preferences-courriel/retours/${id}/debloquer`,
      {},
    );
  }

  // ── Facturation ──

  formules(): Observable<Formule[]> {
    return this.http.get<Formule[]>(`${this.api}/facturation/formules`);
  }

  monCompte(): Observable<MonCompte> {
    return this.http.get<MonCompte>(`${this.api}/facturation/mon-compte`);
  }

  factures(): Observable<Facture[]> {
    return this.http.get<Facture[]>(`${this.api}/facturation/factures`);
  }

  acheterMiseEnAvant(offreId: number): Observable<{ message?: string; redirection?: string }> {
    return this.http.post<{ message?: string; redirection?: string }>(
      `${this.api}/facturation/mise-en-avant`,
      { offreId },
    );
  }

  /** Administration : qui paie quoi. */
  recettes(): Observable<Recettes> {
    return this.http.get<Recettes>(`${this.api}/facturation/recettes`);
  }

  souscrire(formule: string): Observable<{ redirection?: string }> {
    return this.http.post<{ redirection?: string }>(`${this.api}/facturation/abonnement`, {
      formule,
    });
  }

  // ── Integrations ──

  clesApi(): Observable<CleApi[]> {
    return this.http.get<CleApi[]>(`${this.api}/integrations/cles`);
  }

  creerCleApi(nom: string, portees: string[]): Observable<{ cle: string; message: string }> {
    return this.http.post<{ cle: string; message: string }>(`${this.api}/integrations/cles`, {
      nom,
      portees,
    });
  }

  revoquerCleApi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/integrations/cles/${id}`);
  }

  webhooks(): Observable<WebhookAbonne[]> {
    return this.http.get<WebhookAbonne[]>(`${this.api}/integrations/webhooks`);
  }

  creerWebhook(url: string, evenements: string[]): Observable<{ secret: string; message: string }> {
    return this.http.post<{ secret: string; message: string }>(
      `${this.api}/integrations/webhooks`,
      { url, evenements },
    );
  }

  supprimerWebhook(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/integrations/webhooks/${id}`);
  }

  porteesApi(): Observable<MotifSignalement[]> {
    return this.http.get<MotifSignalement[]>(`${this.api}/integrations/portees`);
  }

  evenementsWebhook(): Observable<MotifSignalement[]> {
    return this.http.get<MotifSignalement[]>(`${this.api}/integrations/evenements`);
  }

  // ── Multidiffusion ──
  //
  // Le retrait compte autant que le dépôt : une offre pourvue qui reste
  // en ligne chez trois agrégateurs continue de recevoir des
  // candidatures que personne ne lira.

  destinationsDiffusion(): Observable<{
    configure: boolean;
    destinations: DestinationDiffusion[];
  }> {
    return this.http.get<{ configure: boolean; destinations: DestinationDiffusion[] }>(
      `${this.api}/integrations/diffusion/destinations`,
    );
  }

  suiviDiffusion(offreId: number): Observable<Diffusion[]> {
    return this.http.get<Diffusion[]>(`${this.api}/integrations/diffusion/${offreId}`);
  }

  diffuser(offreId: number, destination: string): Observable<Diffusion> {
    return this.http.post<Diffusion>(`${this.api}/integrations/diffusion/${offreId}`, {
      destination,
    });
  }

  retirerDiffusion(offreId: number, destination: string): Observable<Diffusion> {
    return this.http.delete<Diffusion>(
      `${this.api}/integrations/diffusion/${offreId}?destination=${encodeURIComponent(destination)}`,
    );
  }

  retirerDiffusionPartout(offreId: number): Observable<{ retirees: number }> {
    return this.http.delete<{ retirees: number }>(
      `${this.api}/integrations/diffusion/${offreId}`,
    );
  }
}
