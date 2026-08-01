import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-settings',
  imports: [FormsModule, RouterLink],
  templateUrl: './admin-settings.html',
  styleUrl: './admin-settings.scss',
})
export class AdminSettings implements OnInit {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  settings = signal<any[]>([]);
  loading = signal(true);
  saving = signal(false);
  importing = signal(false);

  importJobs() {
    this.importing.set(true);
    this.admin.importJobs().subscribe({
      next: (r) => { this.importing.set(false); this.toastr.success(r.message, 'Import'); },
      error: (err) => { this.importing.set(false); this.toastr.error(err.error?.message || "Échec de l'import"); },
    });
  }

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
      next: () => { this.toastr.success('Paramètres enregistrés'); this.saving.set(false); },
      error: () => { this.toastr.error('Erreur'); this.saving.set(false); },
    });
  }

  settingIcon(key: string): string {
    const map: Record<string, string> = {
      maintenance_mode: 'bi-tools', default_offer_duration: 'bi-calendar-range',
      max_applications_per_candidate: 'bi-person-bounding-box', require_moderation: 'bi-shield-check',
      welcome_message: 'bi-chat-heart', allow_registration: 'bi-person-plus',
      contact_email: 'bi-envelope',
      legal_raison_sociale: 'bi-building', legal_adresse: 'bi-geo-alt',
      legal_siret: 'bi-hash', legal_tva: 'bi-receipt', legal_telephone: 'bi-telephone',
      legal_directeur_publication: 'bi-person-badge', legal_hebergeur: 'bi-hdd-network',
      legal_dpo: 'bi-shield-lock', legal_conservation_compte: 'bi-clock-history',
      legal_conservation_candidatures: 'bi-clock-history', legal_conservation_journal: 'bi-clock-history',
    };
    return map[key] || 'bi-gear';
  }

  /**
   * Les mentions légales se rangent à part : ce sont les seuls réglages
   * qui paraissent tels quels sur des pages publiques, et un champ vide y
   * affiche « Non renseigné » au visiteur. Les mêler aux réglages
   * fonctionnels ferait manquer ce point.
   */
  estMentionLegale = (key: string) => key.startsWith('legal_');

  get reglages() { return this.settings().filter((s) => !this.estMentionLegale(s.key)); }
  get mentionsLegales() { return this.settings().filter((s) => this.estMentionLegale(s.key)); }

  /** Combien de mentions restent vides : la console le dit avant le site. */
  get mentionsVides(): number {
    return this.mentionsLegales.filter((s) => !String(s.value ?? '').trim()).length;
  }

  settingLabel(key: string): string {
    const map: Record<string, string> = {
      maintenance_mode: 'Mode maintenance', default_offer_duration: 'Durée des offres (jours)',
      max_applications_per_candidate: 'Max. candidatures par candidat', require_moderation: 'Modération obligatoire',
      welcome_message: "Message d'accueil", allow_registration: 'Inscriptions ouvertes',
      contact_email: 'Email de contact',
      legal_raison_sociale: 'Raison sociale, forme juridique, capital',
      legal_adresse: 'Adresse du siège social',
      legal_siret: 'Numéro SIRET',
      legal_tva: 'TVA intracommunautaire',
      legal_telephone: 'Téléphone',
      legal_directeur_publication: 'Directeur de la publication',
      legal_hebergeur: 'Hébergeur',
      legal_dpo: 'Délégué à la protection des données',
      legal_conservation_compte: 'Conservation — compte inactif',
      legal_conservation_candidatures: 'Conservation — candidatures',
      legal_conservation_journal: 'Conservation — journal',
    };
    return map[key] || key;
  }
}
