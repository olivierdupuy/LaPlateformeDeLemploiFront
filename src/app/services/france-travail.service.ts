import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Données France Travail, relayées par notre serveur.
 *
 * Le navigateur n'appelle jamais francetravail.io directement : les
 * identifiants y resteraient exposés. Le serveur porte le jeton et ne
 * renvoie que ce que les pages affichent.
 */

export interface EvenementEmploi {
  id: number;
  titre: string;
  description?: string;
  dateEvenement: string;
  heureDebut?: string;
  heureFin?: string;
  timezone?: string;
  ville?: string;
  codePostal?: string;
  latitude?: number;
  longitude?: number;
  type?: string;
  modalites?: string[];
  objectifs?: string[];
  publics?: string[];
  operations?: string[];
  benefices?: string[];
  deroulement?: string;
  intervenants?: string;
  codesRome?: string[];
  urlDetailEvenement?: string;
  libelleOrganisateurPrincipal?: string;
  libelleEtablissement?: string;
  nombrePlaceTotalPresentiel?: number;
  nombrePlaceTotalDistance?: number;
  nombreInscritPresentiel?: number;
  nombreInscritDistance?: number;
  multisectoriel?: boolean;
}

export interface RechercheEvenements {
  totalElements: number;
  content: EvenementEmploi[];
}

export interface CritereEvenements {
  departement?: string;
  codePostal?: string;
  type?: number;
  modalite?: string;
  secteur?: string;
  dateDebut?: string;
  dateFin?: string;
}

/** Métier ROME devine par ROMEO, avec son score de confiance. */
export interface MetierPredit {
  codeRome: string;
  libelleRome: string;
  libelleAppellation: string;
  codeAppellation: string;
  scorePrediction: number;
}

export interface PredictionRomeo {
  intitule: string;
  metiersRome: MetierPredit[];
}

/**
 * Entreprise a fort potentiel d'embauche.
 *
 * `email: "yes"` ne contient pas l'adresse : l'API dit seulement que
 * l'entreprise accepte d'etre contactee. Le contact passe par la fiche
 * France Travail, ce qui protege les entreprises du demarchage massif.
 */
export interface EntrepriseQuiRecrute {
  id: number;
  siret: string;
  company_name: string;
  office_name?: string;
  rome: string;
  naf: string;
  naf_label?: string;
  city?: string;
  postcode?: string;
  citycode?: string;
  email?: string;
  headcount_min?: number;
  headcount_max?: number;
  location?: { lat: number; lon: number };
  department?: string;
  region?: string;
  /** Note d'embauche calculée par France Travail : le cœur du classement. */
  hiring_potential?: number;
  is_high_potential?: boolean;
}

export interface RechercheEntreprises {
  hits: number;
  items: EntrepriseQuiRecrute[];
  resolved_params?: {
    jobs?: { display?: string; value?: string }[];
    locations?: { display?: string }[];
  };
}

export interface CritereEntreprises {
  rome?: string;
  metier?: string;
  ville?: string;
  departement?: string;
  distance?: number;
  taille?: number;
}

@Injectable({ providedIn: 'root' })
export class FranceTravailService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/francetravail`;

  rechercherEvenements(criteres: CritereEvenements): Observable<RechercheEvenements> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(criteres)) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<RechercheEvenements>(`${this.api}/evenements`, { params: p });
  }

  detailEvenement(id: number): Observable<EvenementEmploi> {
    return this.http.get<EvenementEmploi>(`${this.api}/evenements/${id}`);
  }

  /** Traduit un intitulé écrit à la main en codes métier ROME. */
  devinerMetier(intitule: string): Observable<PredictionRomeo[]> {
    return this.http.get<PredictionRomeo[]>(`${this.api}/metiers/deviner`, {
      params: new HttpParams().set('intitule', intitule),
    });
  }

  entreprisesQuiRecrutent(criteres: CritereEntreprises): Observable<RechercheEntreprises> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(criteres)) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<RechercheEntreprises>(`${this.api}/entreprises-qui-recrutent`, { params: p });
  }
}
