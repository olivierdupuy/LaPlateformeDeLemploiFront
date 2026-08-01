import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import { EtatSecurite } from '../models/auth.model';

export interface PreparationDeuxFacteurs {
  /** La cle brute, celle que l'URI encode. */
  cle: string;
  /** La meme, par groupes de quatre, pour une saisie a la main. */
  cleLisible: string;
  /** otpauth://… — ce que le QR contient. */
  uri: string;
  token?: string;
}

/**
 * Ce qu'une personne peut faire pour proteger son propre compte.
 *
 * Plusieurs de ces appels rendent un jeton refait : toucher au mot de
 * passe ou a la double authentification renouvelle le tampon de securite
 * du compte, ce qui tue les jetons existants — y compris celui qui vient
 * d'agir. L'echange se fait ici, une fois pour toutes, plutot que dans
 * chaque composant qui appelle.
 */
@Injectable({ providedIn: 'root' })
export class SecurityService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = `${environment.apiUrl}/security`;

  /** Chaque reponse peut porter un jeton neuf : on l'adopte au passage. */
  private adopter<T extends { token?: string | null }>(o: Observable<T>): Observable<T> {
    return o.pipe(tap((r) => this.auth.adopterJeton(r?.token)));
  }

  etat(): Observable<EtatSecurite> {
    return this.http.get<EtatSecurite>(`${this.url}/etat`);
  }

  // ── Double authentification ──

  preparer2fa(): Observable<PreparationDeuxFacteurs> {
    return this.adopter(this.http.post<PreparationDeuxFacteurs>(`${this.url}/2fa/preparer`, {}));
  }

  activer2fa(code: string): Observable<{ message: string; codesDeSecours: string[]; token?: string }> {
    return this.adopter(
      this.http.post<{ message: string; codesDeSecours: string[]; token?: string }>(
        `${this.url}/2fa/activer`, { code }),
    ).pipe(tap(() => this.auth.majUtilisateur({ twoFactorEnabled: true })));
  }

  /** Envoie un code au numéro donné, pour le vérifier avant qu'il ne serve. */
  envoyerCodeSms(telephone: string): Observable<{ message: string; telephone: string }> {
    return this.http.post<{ message: string; telephone: string }>(
      `${this.url}/2fa/sms/envoyer`, { telephone });
  }

  activerSms(telephone: string, code: string): Observable<{ message: string; codesDeSecours: string[]; token?: string }> {
    return this.adopter(
      this.http.post<{ message: string; codesDeSecours: string[]; token?: string }>(
        `${this.url}/2fa/sms/activer`, { telephone, code }),
    ).pipe(tap(() => this.auth.majUtilisateur({ twoFactorEnabled: true })));
  }

  desactiver2fa(motDePasse: string, code: string): Observable<{ message: string; token?: string }> {
    return this.adopter(
      this.http.post<{ message: string; token?: string }>(
        `${this.url}/2fa/desactiver`, { motDePasse, code }),
    ).pipe(tap(() => this.auth.majUtilisateur({ twoFactorEnabled: false })));
  }

  regenererCodes(motDePasse: string): Observable<{ codesDeSecours: string[]; token?: string }> {
    return this.adopter(
      this.http.post<{ codesDeSecours: string[]; token?: string }>(
        `${this.url}/2fa/codes-de-secours`, { motDePasse }),
    );
  }

  // ── Mot de passe ──

  changerMotDePasse(actuel: string, nouveau: string): Observable<{ message: string; token?: string }> {
    return this.adopter(
      this.http.post<{ message: string; token?: string }>(
        `${this.url}/mot-de-passe`, { actuel, nouveau }),
    );
  }

  // ── Appareils ──

  fermerSession(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.url}/sessions/${id}`);
  }

  fermerToutesLesSessions(): Observable<{ fermees: number; message: string }> {
    return this.http.post<{ fermees: number; message: string }>(`${this.url}/sessions/tout-fermer`, {});
  }

  // ── Adresse ──

  envoyerConfirmation(): Observable<{ envoye: boolean; message: string }> {
    return this.http.post<{ envoye: boolean; message: string }>(`${this.url}/email/confirmer`, {});
  }
}
