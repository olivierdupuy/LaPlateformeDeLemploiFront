import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private http = inject(HttpClient);
  private loaded = false;

  settings = signal<Record<string, string>>({});

  get welcomeMessage(): string { return this.settings()['welcome_message'] || ''; }
  get contactEmail(): string { return this.settings()['contact_email'] || ''; }
  get allowRegistration(): boolean { return this.settings()['allow_registration'] !== 'false'; }
  get requireModeration(): boolean { return this.settings()['require_moderation'] === 'true'; }
  get maintenanceMode(): boolean { return this.settings()['maintenance_mode'] === 'true'; }
  /**
   * Mentions legales.
   *
   * Elles vivent dans les parametres et non dans le code : ce sont des
   * informations d'exploitation que l'editeur saisit depuis la console,
   * sans redeploiement. Une valeur vide vaut « non renseignee » — la page
   * le signale plutot que d'afficher un blanc.
   */
  legal(cle: string): string {
    return this.settings()['legal_' + cle]?.trim() || '';
  }

  get maxApplications(): number {
    const v = parseInt(this.settings()['max_applications_per_candidate'] || '0', 10);
    return v > 0 ? v : 0;
  }

  load(): void {
    if (this.loaded) return;
    this.loaded = true;
    this.http.get<Record<string, string>>(`${environment.apiUrl}/admin/public-settings`).subscribe({
      next: (s) => this.settings.set(s),
      error: () => {},
    });
  }
}
