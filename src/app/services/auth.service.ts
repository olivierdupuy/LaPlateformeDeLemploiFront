import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import {
  LoginRequest,
  RegisterJobSeekerRequest,
  RegisterCompanyRequest,
  AuthResponse,
  UserProfile
} from '../models/auth.model';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = '/api/auth';
  private currentUserSubject = new BehaviorSubject<UserProfile | null>(this.loadUser());

  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  get currentUser(): UserProfile | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return !!this.getToken();
  }

  get isCompany(): boolean {
    return this.currentUser?.role === 'Company';
  }

  get isJobSeeker(): boolean {
    return this.currentUser?.role === 'JobSeeker';
  }

  login(dto: LoginRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, dto).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  registerJobSeeker(dto: RegisterJobSeekerRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/jobseeker`, dto).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  registerCompany(dto: RegisterCompanyRequest): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register/company`, dto).pipe(
      tap(res => this.storeAuth(res))
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUserSubject.next(null);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  private storeAuth(res: AuthResponse): void {
    localStorage.setItem('auth_token', res.token);
    localStorage.setItem('auth_user', JSON.stringify(res.user));
    this.currentUserSubject.next(res.user);
  }

  private loadUser(): UserProfile | null {
    const json = localStorage.getItem('auth_user');
    return json ? JSON.parse(json) : null;
  }
}
