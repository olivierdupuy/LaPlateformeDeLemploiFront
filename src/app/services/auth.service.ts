import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SignalRService } from './signalr.service';
import { Observable, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  UserDto,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
} from '../models/auth.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'lpde_token';
const USER_KEY = 'lpde_user';
/**
 * Emprunt en cours. Conserve a part du jeton, et persiste : un
 * rechargement de page ne doit pas faire oublier qu'on agit sous une
 * autre identite — c'est precisement ce qu'il ne faut jamais oublier.
 */
const EMPRUNT_KEY = 'lpde_emprunt';

export interface EmpruntEnCours {
  /** L'administrateur reel, celui a qui rendre la main. */
  parNom: string;
  /** Le compte emprunte, rappele dans le bandeau. */
  compte: string;
  expireA: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private signalR = inject(SignalRService);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<UserDto | null>(this.loadUser());

  /** Non nul tant que l'administrateur agit sous une autre identite. */
  emprunt = signal<EmpruntEnCours | null>(this.chargerEmprunt());
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  // Les roles sont exclusifs : un administrateur administre, il ne
  // publie pas d'offres et ne postule pas.
  isRecruiter = computed(() => this.currentUser()?.role === 'Recruiter');
  isCandidate = computed(() => this.currentUser()?.role === 'Candidate');

  /**
   * Un administrateur sans second facteur. La garde s'en sert pour le
   * conduire a l'activer : son compte voit toute la base et peut prendre
   * la main sur n'importe qui.
   */
  doitActiver2fa = computed(() => {
    const u = this.currentUser();
    return !!u && u.role === 'Admin' && u.twoFactorEnabled === false;
  });

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  register(data: RegisterRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, data).pipe(
      tap((res) => this.handleAuth(res))
    );
  }

  login(data: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, data).pipe(
      tap((res) => this.handleAuth(res))
    );
  }

  /** SSO : échange un jeton Google contre une session. */
  googleSignIn(credential: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/google`, { credential }).pipe(
      tap((res) => this.handleAuth(res))
    );
  }

  getMe(): Observable<UserDto> {
    return this.http.get<UserDto>(`${this.apiUrl}/me`).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  updateProfile(data: UpdateProfileRequest): Observable<UserDto> {
    return this.http.put<UserDto>(`${this.apiUrl}/profile`, data).pipe(
      tap((user) => {
        this.currentUser.set(user);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      })
    );
  }

  /**
   * Deuxieme temps de la connexion : le code.
   * Le defi ne vaut que pour cet echange — il n'ouvre aucune page.
   */
  verifier2fa(challengeToken: string, code: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/2fa/verifier`, { challengeToken, code })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  /** SSO : echange un code d'autorisation LinkedIn contre une session. */
  linkedInSignIn(code: string, redirectUri: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/linkedin`, { code, redirectUri })
      .pipe(tap((res) => this.handleAuth(res)));
  }

  /** Redemande un SMS pendant le défi : un message se perd ou arrive tard. */
  renvoyerCode(challengeToken: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/2fa/renvoyer`, { challengeToken });
  }

  motDePasseOublie(email: string, piege?: { siteWeb: string; msSaisie: number }): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/mot-de-passe-oublie`, { email, ...piege });
  }

  reinitialiserMotDePasse(userId: string, jeton: string, nouveauMotDePasse: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reinitialiser-mot-de-passe`, {
      userId, jeton, nouveauMotDePasse,
    });
  }

  confirmerEmail(userId: string, jeton: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/confirmer-email`, { userId, jeton });
  }

  /**
   * Adopte un jeton refait par le serveur.
   *
   * Changer un mot de passe ou toucher a la double authentification
   * renouvelle le tampon de securite du compte, ce qui tue tous les jetons
   * existants — y compris celui qui vient d'agir. Le serveur en rend un
   * neuf pour la meme session ; sans cet echange, on serait deconnecte
   * pour avoir fait exactement ce qu'on demandait.
   */
  adopterJeton(token?: string | null): void {
    if (token) localStorage.setItem(TOKEN_KEY, token);
  }

  /** Met a jour l'utilisateur en memoire sans repasser par le serveur. */
  majUtilisateur(champs: Partial<UserDto>): void {
    const u = this.currentUser();
    if (!u) return;
    const suivant = { ...u, ...champs };
    this.currentUser.set(suivant);
    localStorage.setItem(USER_KEY, JSON.stringify(suivant));
  }

  /** RGPD : export des données personnelles. */
  exportData(): Observable<any> {
    return this.http.get(`${this.apiUrl}/export-data`);
  }

  /**
   * RGPD : effacement définitif du compte.
   *
   * Le mot de passe est redemandé au moment de l'acte : sans lui, une
   * session ouverte sur un poste laissé sans surveillance suffisait à
   * tout détruire.
   */
  deleteAccount(motDePasse?: string): Observable<any> {
    return this.http.request('delete', `${this.apiUrl}/account`, {
      body: { motDePasse: motDePasse ?? null },
    });
  }

  // Admin endpoints
  getAllUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(`${this.apiUrl}/users`);
  }

  toggleUserActive(id: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/toggle-active`, {});
  }

  changeUserRole(id: string, role: string): Observable<UserDto> {
    return this.http.patch<UserDto>(`${this.apiUrl}/users/${id}/role`, { role });
  }

  // ═══ Prise en main de compte ═══

  private chargerEmprunt(): EmpruntEnCours | null {
    try {
      const brut = localStorage.getItem(EMPRUNT_KEY);
      return brut ? (JSON.parse(brut) as EmpruntEnCours) : null;
    } catch {
      return null;
    }
  }

  /**
   * Prend la main sur un compte.
   *
   * Le jeton d'administration est mis de cote, pas jete : c'est lui qu'on
   * rendra a la sortie. Le serveur en delivre un autre, portant les deux
   * identites, valable trente minutes.
   */
  prendreEnMain(userId: string): Observable<any> {
    const jetonAdmin = this.token;
    const admin = this.currentUser();

    return this.http
      .post<any>(`${environment.apiUrl}/admin/users/${userId}/impersonate`, {})
      .pipe(
        tap((res) => {
          localStorage.setItem('lpde_token_admin', jetonAdmin ?? '');
          localStorage.setItem('lpde_user_admin', JSON.stringify(admin));

          localStorage.setItem(TOKEN_KEY, res.token);
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
          this.currentUser.set(res.user);

          const e: EmpruntEnCours = {
            parNom: res.emprunt?.parNom ?? 'Administration',
            compte: `${res.user.firstName} ${res.user.lastName}`,
            expireA: res.expiration,
          };
          localStorage.setItem(EMPRUNT_KEY, JSON.stringify(e));
          this.emprunt.set(e);

          // Le tuyau temps reel portait le jeton precedent : il doit
          // repartir sous la nouvelle identite.
          this.signalR.stop();
          this.signalR.start(res.token);
        }),
      );
  }

  /** Rend la main a l'administrateur. */
  rendreLaMain(): Observable<any> {
    return this.http
      .post<any>(`${environment.apiUrl}/admin/impersonate/stop`, {})
      .pipe(
        tap((res) => {
          this.appliquerRetour(res.token, res.user);
        }),
      );
  }

  /**
   * Retour de secours, sans le serveur : si le jeton d'emprunt a expire,
   * l'appel de sortie echoue et on resterait bloque sur un compte qu'on
   * ne peut plus quitter. Le jeton d'administration mis de cote permet de
   * revenir quand meme.
   */
  rendreLaMainLocalement(): boolean {
    const jeton = localStorage.getItem('lpde_token_admin');
    const brut = localStorage.getItem('lpde_user_admin');
    if (!jeton || !brut) return false;
    this.appliquerRetour(jeton, JSON.parse(brut));
    return true;
  }

  private appliquerRetour(jeton: string, admin: UserDto) {
    localStorage.setItem(TOKEN_KEY, jeton);
    localStorage.setItem(USER_KEY, JSON.stringify(admin));
    this.currentUser.set(admin);

    localStorage.removeItem(EMPRUNT_KEY);
    localStorage.removeItem('lpde_token_admin');
    localStorage.removeItem('lpde_user_admin');
    this.emprunt.set(null);

    this.signalR.stop();
    this.signalR.start(jeton);
  }

  logout(): void {
    // Le tuyau temps reel se ferme avec la session : c'est le seul moment
    // ou il doit l'etre.
    this.signalR.stop();
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EMPRUNT_KEY);
    localStorage.removeItem('lpde_token_admin');
    localStorage.removeItem('lpde_user_admin');
    this.emprunt.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/']);
    this.toastr.info('Deconnecte');
  }

  private handleAuth(res: AuthResponse): void {
    // Une connexion qui reclame un code n'est pas une connexion : elle ne
    // doit rien ecrire, sinon l'application se croirait ouverte.
    if (res.requiresTwoFactor || !res.token) return;

    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUser.set(res.user);
  }

  private loadUser(): UserDto | null {
    try {
      const token = localStorage.getItem(TOKEN_KEY);
      const user = localStorage.getItem(USER_KEY);
      if (!token || !user) return null;
      return JSON.parse(user);
    } catch {
      return null;
    }
  }
}
