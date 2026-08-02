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

@Injectable({ providedIn: 'root' })
export class CandidateFeaturesService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/candidate`;

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
