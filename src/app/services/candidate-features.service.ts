import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Un rapprochement effectivement établi entre un profil et une offre.
 *
 * `estimation` signale un score calculé sur une minorité de critères,
 * l'annonce ne disant ni son salaire, ni l'expérience attendue, ni le
 * niveau de formation. `assiste` distingue la synthèse rédigée par le
 * modèle des critères calculés : les deux n'engagent pas de la même façon,
 * et l'affichage doit pouvoir le dire.
 */
export interface CorrespondanceEtablie {
  score: number;
  fiabilite: number;
  estimation: boolean;
  raisons: string[];
  reserves: string[];
  resume: string | null;
  assiste: boolean;
  /**
   * D'où viennent les souhaits qui ont pesé dans ce score : de choix
   * déclarés, ou de la dernière recherche enregistrée. Un candidat qui ne
   * reconnaît pas son résultat doit pouvoir remonter à ce qui l'a produit.
   */
  origineSouhaits: 'declarees' | 'deduites';
}

/**
 * Une union discriminée plutôt qu'un objet aux champs optionnels.
 *
 * `applicable: false` arrive quand le profil ne dit rien d'exploitable —
 * ni métier, ni compétences, ni ville : afficher « 0 % » à quelqu'un dont
 * on ne sait rien ressemblerait à un verdict alors que c'est une absence
 * de données. Le distinguer par un booléen permet au compilateur de
 * garantir qu'on ne lit pas un score qui n'existe pas.
 */
export type Correspondance =
  | { applicable: false }
  | ({ applicable: true } & CorrespondanceEtablie);

/** Les quatre critères que le moteur sait peser. */
export interface SouhaitsEmploi {
  salaireAnnuelMinimum: number | null;
  contrat: string | null;
  distanciel: boolean | null;
  rayonKm: number | null;
}

/**
 * Ce que le candidat cherche, et d'où cela vient.
 *
 * `origine` n'est pas décoratif. Tant que rien n'est déclaré, la
 * correspondance repose sur la dernière recherche enregistrée — ce qui
 * peut être une intention réelle comme une curiosité d'un soir. L'écran
 * doit pouvoir le dire : c'est la différence entre un score qu'on
 * comprend et un score qu'on subit.
 *
 * `effectifs` porte ce qui sert réellement au calcul, déclaré ou déduit.
 * Sans lui, une page ne peut pas expliquer un score à quelqu'un qui n'a
 * jamais rien renseigné.
 */
export interface PreferencesEmploi extends SouhaitsEmploi {
  declarees: boolean;
  origine: 'declarees' | 'deduites';
  misAJourLe: string | null;
  effectifs: SouhaitsEmploi;
}

@Injectable({ providedIn: 'root' })
export class CandidateFeaturesService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/candidate`;

  // ── Préférences d'emploi ──
  preferences(): Observable<PreferencesEmploi> {
    return this.http.get<PreferencesEmploi>(`${this.api}/preferences`);
  }

  /** Un champ nul veut dire « indifférent », et non « zéro ». */
  enregistrerPreferences(p: SouhaitsEmploi): Observable<PreferencesEmploi> {
    return this.http.put<PreferencesEmploi>(`${this.api}/preferences`, p);
  }

  // Withdraw application
  withdrawApplication(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/applications/${id}/withdraw`);
  }

  // Recommendations
  getRecommendations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.api}/recommendations`);
  }

  /**
   * Le rapprochement entre le profil et une offre précise.
   *
   * Réservé à la page de détail : c'est le seul endroit où le serveur
   * demande une synthèse au modèle, une page valant un appel. Renvoie
   * `{ applicable: false }` quand le profil ne dit rien d'exploitable —
   * mieux vaut n'afficher aucune correspondance qu'un « 0 % » qui
   * ressemble à un verdict.
   */
  getCorrespondance(jobId: number): Observable<Correspondance> {
    return this.http.get<Correspondance>(`${this.api}/correspondance/${jobId}`);
  }

  // Notes
  getNote(jobId: number): Observable<any> {
    return this.http.get<any>(`${this.api}/notes/${jobId}`);
  }

  saveNote(jobId: number, content: string): Observable<void> {
    return this.http.put<void>(`${this.api}/notes/${jobId}`, { content });
  }

  // Interview slots
  proposeSlots(interviewId: number, slots: string[], message?: string): Observable<void> {
    return this.http.patch<void>(`${this.api}/interviews/${interviewId}/propose-slots`, { slots, message });
  }

  // Analytics
  getAnalytics(): Observable<any> {
    return this.http.get<any>(`${this.api}/analytics`);
  }

  // Alerts
  toggleSearchAlert(searchId: number): Observable<any> {
    return this.http.patch<any>(`${this.api}/saved-searches/${searchId}/toggle-alert`, {});
  }

  checkAlerts(): Observable<any> {
    return this.http.get<any>(`${this.api}/check-alerts`);
  }
}
