import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

declare const google: any;

@Component({
  selector: 'app-google-signin-button',
  standalone: true,
  template: `
    @if (enabled) {
      <div class="gsi-wrap">
        <div class="gsi-sep"><span>ou</span></div>
        <div #btn class="gsi-btn"></div>
      </div>
    }
  `,
  styles: [`
    .gsi-wrap { display: flex; flex-direction: column; align-items: center; gap: 1rem; margin-top: 1.25rem; }
    .gsi-sep { position: relative; width: 100%; text-align: center; }
    .gsi-sep::before { content: ''; position: absolute; top: 50%; left: 0; right: 0; height: 1px; background: var(--line); }
    .gsi-sep span { position: relative; background: var(--canvas); padding: 0 0.75rem; font-size: 0.78rem; color: var(--muted); }
    .gsi-btn { min-height: 40px; display: flex; justify-content: center; }
  `],
})
export class GoogleSignInButton implements AfterViewInit {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  enabled = !!environment.googleClientId;
  @ViewChild('btn') btn?: ElementRef<HTMLElement>;

  ngAfterViewInit() {
    if (!this.enabled) return;
    this.loadScript().then(() => this.init()).catch(() => {});
  }

  private loadScript(): Promise<void> {
    if (typeof google !== 'undefined' && google?.accounts?.id) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
  }

  private init() {
    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (resp: any) => this.handle(resp),
    });
    if (this.btn) {
      google.accounts.id.renderButton(this.btn.nativeElement, {
        theme: 'outline', size: 'large', text: 'continue_with', width: 300,
      });
    }
  }

  private handle(resp: any) {
    this.auth.googleSignIn(resp.credential).subscribe({
      next: () => { this.toastr.success('Connecté avec Google'); this.router.navigate(['/']); },
      error: (e) => this.toastr.error(e.error?.message || 'Échec de la connexion Google'),
    });
  }
}
