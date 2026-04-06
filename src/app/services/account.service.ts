import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface AccountSecurity {
  email: string;
  createdAt: string;
  lastPasswordChange: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly api = '/api/account';

  constructor(private http: HttpClient) {}

  getSecurityInfo(): Observable<AccountSecurity> {
    return this.http.get<AccountSecurity>(this.api + '/security');
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(this.api + '/change-password', { currentPassword, newPassword });
  }

  changeEmail(newEmail: string, password: string): Observable<{ message: string; email: string }> {
    return this.http.put<{ message: string; email: string }>(this.api + '/change-email', { newEmail, password });
  }

  deleteAccount(password: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(this.api, { body: { password } });
  }
}
