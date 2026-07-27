import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { ConsoleShell } from '../console-shell/console-shell';
import { companyColor } from '../../utils/job.utils';
import { fichierUrl } from '../../utils/fichiers';

/**
 * Fiche d'un compte, ouverte depuis le tableau des utilisateurs.
 *
 * Un compte se juge sur ce qu'il fait, pas sur ses seules coordonnées :
 * la fiche réunit le profil éditable et tout ce que la personne a produit
 * — candidatures, alertes, entretiens, CV, notes, journal.
 *
 * Le formulaire travaille sur une copie. Tant que l'enregistrement n'est
 * pas demandé, la fiche affichée reste celle du serveur : on peut donc
 * comparer, et abandonner sans conséquence.
 */

type Tab = 'profil' | 'candidatures' | 'recherches' | 'entretiens' | 'cv' | 'notes' | 'journal' | 'compte';

const TABS: { key: Tab; label: string; icon: string }[] = [
  { key: 'profil', label: 'Profil', icon: 'bi-person-vcard' },
  { key: 'candidatures', label: 'Candidatures', icon: 'bi-file-earmark-text' },
  { key: 'recherches', label: 'Alertes', icon: 'bi-bell' },
  { key: 'entretiens', label: 'Entretiens', icon: 'bi-calendar-event' },
  { key: 'cv', label: 'CV', icon: 'bi-file-person' },
  { key: 'notes', label: 'Notes', icon: 'bi-sticky' },
  { key: 'journal', label: 'Journal', icon: 'bi-clock-history' },
  { key: 'compte', label: 'Compte', icon: 'bi-shield-lock' },
];

const STATUS_LABELS: Record<string, string> = {
  Pending: 'En attente', Reviewed: 'Examinée', Accepted: 'Acceptée', Rejected: 'Refusée',
  Proposed: 'Proposé', Completed: 'Terminé', Cancelled: 'Annulé',
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-yellow', Reviewed: 'badge-blue', Accepted: 'badge-green', Rejected: 'badge-red',
  Proposed: 'badge-yellow', Completed: 'badge-blue', Cancelled: 'badge-red',
};

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Administrateur', Recruiter: 'Recruteur', Candidate: 'Candidat',
};

/** Les sections de CV, dans l'ordre où un CV se lit. */
const CV_SECTIONS: { key: string; label: string }[] = [
  { key: 'Experience', label: 'Expériences' },
  { key: 'Formation', label: 'Formations' },
  { key: 'Competence', label: 'Compétences' },
  { key: 'Langue', label: 'Langues' },
  { key: 'Projet', label: 'Projets' },
  { key: 'CentreInteret', label: "Centres d'intérêt" },
];

@Component({
  selector: 'app-admin-user-detail',
  imports: [ConsoleShell, RouterLink, FormsModule, DatePipe],
  templateUrl: './admin-user-detail.html',
  styleUrl: './admin-user-detail.scss',
})
export class AdminUserDetail implements OnInit {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  tabs = TABS;
  cvSections = CV_SECTIONS;
  companyColor = companyColor;
  fichierUrl = fichierUrl;
  statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
  statusBadge = (s: string) => STATUS_BADGE[s] ?? '';
  roleLabel = (r: string) => ROLE_LABELS[r] ?? r;

  dossier = signal<any>(null);
  loading = signal(true);
  saving = signal(false);
  activeTab = signal<Tab>('profil');

  /** Copie de travail du profil : le serveur reste la référence. */
  form = signal<Record<string, any>>({});
  newPassword = '';

  private userId = '';

  user = computed(() => this.dossier()?.user ?? null);
  applications = computed<any[]>(() => this.dossier()?.applications ?? []);
  savedSearches = computed<any[]>(() => this.dossier()?.savedSearches ?? []);
  interviews = computed<any[]>(() => this.dossier()?.interviews ?? []);
  cv = computed<any[]>(() => this.dossier()?.cvSections ?? []);
  notes = computed<any[]>(() => this.dossier()?.notes ?? []);
  activity = computed<any[]>(() => this.dossier()?.activity ?? []);

  /** Compteurs affichés sur les onglets : le contenu s'annonce. */
  counts = computed(() => ({
    candidatures: this.applications().length,
    recherches: this.savedSearches().length,
    entretiens: this.interviews().length,
    cv: this.cv().length,
    notes: this.notes().length,
    journal: this.activity().length,
  }));

  /** Le résumé d'en-tête : ce qui se lit sans ouvrir un onglet. */
  summary = computed(() => {
    const apps = this.applications();
    const accepted = apps.filter((a) => a.status === 'Accepted').length;
    return {
      total: apps.length,
      accepted,
      pending: apps.filter((a) => a.status === 'Pending').length,
      alerts: this.savedSearches().filter((s) => s.alertEnabled).length,
      interviews: this.interviews().length,
      successRate: apps.length ? Math.round((accepted / apps.length) * 100) : 0,
    };
  });

  /** Les compétences sont stockées séparées par virgules. */
  skillList = computed<string[]>(() =>
    String(this.user()?.skills ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  );

  cvOf = (type: string) => this.cv().filter((c) => c.sectionType === type);

  /** Un champ modifié mais pas encore enregistré. */
  isDirty = computed(() => {
    const u = this.user();
    const f = this.form();
    if (!u) return false;
    return Object.keys(f).some((k) => (f[k] ?? '') !== (u[k] ?? ''));
  });

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id') ?? '';

    const tab = this.route.snapshot.queryParamMap.get('onglet') as Tab | null;
    if (tab && TABS.some((t) => t.key === tab)) this.activeTab.set(tab);

    this.load();
  }

  private load() {
    this.loading.set(true);
    this.admin.getUserDossier(this.userId).subscribe({
      next: (d) => {
        this.dossier.set(d);
        this.resetForm();
        this.loading.set(false);
      },
      error: () => {
        this.toastr.error('Ce compte est introuvable');
        this.loading.set(false);
      },
    });
  }

  private resetForm() {
    const u = this.user();
    if (!u) return;
    this.form.set({
      firstName: u.firstName ?? '', lastName: u.lastName ?? '', email: u.email ?? '',
      phoneNumber: u.phoneNumber ?? '', title: u.title ?? '', bio: u.bio ?? '',
      skills: u.skills ?? '', education: u.education ?? '', city: u.city ?? '',
      company: u.company ?? '', linkedInUrl: u.linkedInUrl ?? '', portfolioUrl: u.portfolioUrl ?? '',
      avatarUrl: u.avatarUrl ?? '', resumeUrl: u.resumeUrl ?? '',
      experienceYears: u.experienceYears ?? null,
      isSearchable: !!u.isSearchable, isActive: !!u.isActive,
    });
  }

  setTab(tab: Tab) {
    this.activeTab.set(tab);
    // L'onglet vit dans l'URL : la fiche se partage et se recharge ouverte
    // au bon endroit.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { onglet: tab },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  field(key: string): any {
    return this.form()[key];
  }

  setField(key: string, value: any) {
    this.form.update((f) => ({ ...f, [key]: value }));
  }

  save() {
    this.saving.set(true);
    this.admin.updateUser(this.userId, this.form()).subscribe({
      next: () => {
        this.toastr.success('Profil enregistré');
        this.saving.set(false);
        this.load();
      },
      error: (e) => {
        this.toastr.error(e?.error?.message ?? "L'enregistrement a échoué");
        this.saving.set(false);
      },
    });
  }

  cancel() {
    this.resetForm();
  }

  toggleActive() {
    const next = !this.form()['isActive'];
    this.setField('isActive', next);
    this.admin.updateUser(this.userId, { isActive: next }).subscribe({
      next: () => {
        this.toastr.success(next ? 'Compte réactivé' : 'Compte suspendu');
        this.load();
      },
      error: () => this.toastr.error('Erreur'),
    });
  }

  changeRole(role: string) {
    this.auth.changeUserRole(this.userId, role).subscribe({
      next: () => {
        this.toastr.success('Rôle modifié');
        this.load();
      },
      error: () => this.toastr.error('Erreur'),
    });
  }

  // ═══ Pieces du dossier ═══
  // Chaque ligne s'enregistre a son propre geste. Un bouton unique par
  // onglet laisserait croire a un etat d'ensemble a valider, alors qu'il
  // s'agit d'enregistrements independants.

  /** Ligne en cours d'ecriture, pour neutraliser ses commandes. */
  enCours = signal<string | null>(null);

  private ecrire(cle: string, appel: any, message: string) {
    this.enCours.set(cle);
    appel.subscribe({
      next: () => {
        this.toastr.success(message);
        this.enCours.set(null);
        this.load();
      },
      error: (e: any) => {
        this.toastr.error(e?.error?.message ?? "L'enregistrement a échoué");
        this.enCours.set(null);
      },
    });
  }

  changerStatutCandidature(a: any, statut: string) {
    if (statut === a.status) return;
    this.ecrire(`c${a.id}`, this.admin.majCandidature(a.id, { statut }), 'Statut enregistré');
  }

  basculerArchivage(a: any) {
    this.ecrire(`c${a.id}`, this.admin.majCandidature(a.id, { archivee: !a.isArchived }),
                a.isArchived ? 'Candidature réactivée' : 'Candidature archivée');
  }

  supprimerCandidature(a: any) {
    // Une candidature effacee ne se retrouve pas : on demande confirmation.
    if (!confirm(`Supprimer définitivement la candidature de ${a.fullName} ?`)) return;
    this.ecrire(`c${a.id}`, this.admin.supprimerCandidature(a.id), 'Candidature supprimée');
  }

  basculerAlerte(s: any) {
    this.ecrire(`r${s.id}`, this.admin.majRecherche(s.id, { alerteActive: !s.alertEnabled }),
                s.alertEnabled ? 'Alerte désactivée' : 'Alerte activée');
  }

  supprimerRecherche(s: any) {
    if (!confirm('Supprimer cette recherche enregistrée ?')) return;
    this.ecrire(`r${s.id}`, this.admin.supprimerRecherche(s.id), 'Recherche supprimée');
  }

  changerStatutEntretien(i: any, statut: string) {
    if (statut === i.status) return;
    this.ecrire(`e${i.id}`, this.admin.majEntretien(i.id, { statut }), 'Statut enregistré');
  }

  supprimerEntretien(i: any) {
    if (!confirm('Supprimer cet entretien ?')) return;
    this.ecrire(`e${i.id}`, this.admin.supprimerEntretien(i.id), 'Entretien supprimé');
  }

  supprimerNote(n: any) {
    if (!confirm('Supprimer cette note ?')) return;
    this.ecrire(`n${n.id}`, this.admin.supprimerNote(n.id), 'Note supprimée');
  }

  supprimerSectionCv(c: any) {
    if (!confirm('Supprimer cet élément du CV ?')) return;
    this.ecrire(`v${c.id}`, this.admin.supprimerSectionCv(c.id), 'Élément supprimé');
  }

  resetPassword() {
    if (this.newPassword.trim().length < 6) {
      this.toastr.error('Le mot de passe doit faire au moins 6 caractères');
      return;
    }
    this.admin.setUserPassword(this.userId, this.newPassword).subscribe({
      next: () => {
        this.toastr.success('Mot de passe réinitialisé');
        this.newPassword = '';
      },
      error: (e) => this.toastr.error(e?.error?.message ?? 'Erreur'),
    });
  }
}
