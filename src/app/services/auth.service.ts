import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import {
  UserDto,
  AuthResponse,
  RegisterRequest,
  LoginRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '../models/auth.model';
import { environment } from '../../environments/environment';

const TOKEN_KEY = 'lpde_token';
const USER_KEY = 'lpde_user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private apiUrl = `${environment.apiUrl}/auth`;

  currentUser = signal<UserDto | null>(this.loadUser());
  isLoggedIn = computed(() => !!this.currentUser());
  isAdmin = computed(() => this.currentUser()?.role === 'Admin');
  isRecruiter = computed(() => this.currentUser()?.role === 'Recruiter' || this.currentUser()?.role === 'Admin');

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

  changePassword(data: ChangePasswordRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/change-password`, data);
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

  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUser.set(null);
    this.router.navigate(['/']);
    this.toastr.info('Deconnecte');
  }

  private handleAuth(res: AuthResponse): void {
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
