import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.scss',
})
export class AdminSettings implements OnInit {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  settings = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);

  ngOnInit() {
    this.admin.getSettings().subscribe(s => {
      this.settings.set(s);
      this.loading.set(false);
    });
  }

  save() {
    this.saving.set(true);
    const data = this.settings().map(s => ({ key: s.key, value: s.value, type: s.type, description: s.description }));
    this.admin.updateSettings(data).subscribe({
      next: () => { this.toastr.success('Parametres sauvegardes'); this.saving.set(false); },
      error: () => { this.toastr.error('Erreur'); this.saving.set(false); },
    });
  }

  settingIcon(key: string): string {
    const map: Record<string, string> = {
      maintenance_mode: 'bi-tools', default_offer_duration: 'bi-calendar-range',
      max_applications_per_candidate: 'bi-person-bounding-box', require_moderation: 'bi-shield-check',
      welcome_message: 'bi-chat-heart', allow_registration: 'bi-person-plus',
      contact_email: 'bi-envelope',
    };
    return map[key] || 'bi-gear';
  }

  settingLabel(key: string): string {
    const map: Record<string, string> = {
      maintenance_mode: 'Mode maintenance', default_offer_duration: 'Duree des offres (jours)',
      max_applications_per_candidate: 'Max candidatures par candidat', require_moderation: 'Moderation obligatoire',
      welcome_message: "Message d'accueil", allow_registration: 'Inscriptions ouvertes',
      contact_email: 'Email de contact',
    };
    return map[key] || key;
  }
}
