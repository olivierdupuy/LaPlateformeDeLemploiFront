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

/** Fiche metier ROME 4.0 : ce que le metier mobilise et ce qu'il suppose de savoir. */
export interface FicheMetier {
  code: string;
  obsolete?: boolean;
  metier: { code: string; libelle: string };
  groupesCompetencesMobilisees?: GroupeCompetences[];
  groupesSavoirs?: GroupeSavoirs[];
}

export interface GroupeCompetences {
  /** L'« enjeu » regroupe les competences : data, relation client, securite… */
  enjeu?: { code: string; libelle: string };
  competences?: { libelle: string; code?: string; type?: string }[];
}

export interface GroupeSavoirs {
  categorieSavoirs?: { code: string; libelle: string };
  savoirs?: { libelle: string; code?: string; type?: string }[];
}

/**
 * Marche du travail : nombre d'offres par origine, sur un territoire et
 * un trimestre. Les quatre lignes distinguent les offres deposees a
 * France Travail de l'ensemble du marche, au trimestre et sur douze mois.
 */
export interface MarcheDuTravail {
  codeIndicateur: string;
  libIndicateur: string;
  listeValeursParPeriode: ValeurMarche[];
}

export interface ValeurMarche {
  libTerritoire: string;
  libActivite: string;
  codeNomenclature: string;
  libNomenclature: string;
  libPeriode: string;
  valeurPrincipaleNombre: number;
  valeurSecondairePourcentage?: number;
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

  ficheMetier(code: string): Observable<FicheMetier> {
    return this.http.get<FicheMetier>(`${this.api}/metiers/${code}`);
  }

  marcheDuTravail(rome: string, departement?: string): Observable<MarcheDuTravail> {
    let p = new HttpParams().set('rome', rome);
    if (departement) p = p.set('departement', departement);
    return this.http.get<MarcheDuTravail>(`${this.api}/marche-du-travail`, { params: p });
  }

  entreprisesQuiRecrutent(criteres: CritereEntreprises): Observable<RechercheEntreprises> {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(criteres)) {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    }
    return this.http.get<RechercheEntreprises>(`${this.api}/entreprises-qui-recrutent`, { params: p });
  }
}
