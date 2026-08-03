import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { companyColor } from '../../utils/job.utils';
import { FichiersService } from '../../utils/fichiers';

/**
 * Fiche d'un compte, ouverte depuis le tableau des utilisateurs.
 *
 * La fiche ne connaissait qu'un métier, celui de candidat : candidatures,
 * alertes, CV, notes. Ouverte sur un recruteur, elle alignait donc six
 * sections à zéro — alors que cette personne publie des offres, reçoit
 * des candidatures et mène des entretiens, et que la base le sait.
 *
 * Un dossier suit donc désormais ce que la personne fait. Le rôle décide
 * des sections et de leur ordre ; mais une section qui porte quelque
 * chose n'est jamais masquée, même si le rôle ne l'attendait pas — les
 * données ont le dernier mot sur la convention.
 *
 * Le formulaire travaille sur une copie. Tant que l'enregistrement n'est
 * pas demandé, la fiche affichée reste celle du serveur : on peut donc
 * comparer, et abandonner sans conséquence.
 */

type Tab =
  | 'profil'
  | 'offres' | 'recues' | 'menes'
  | 'candidatures' | 'recherches' | 'entretiens' | 'cv' | 'notes'
  | 'securite' | 'journal' | 'compte';

interface Onglet {
  label: string;
  icon: string;
  groupe: 'identite' | 'activite' | 'gestion';
  /** Une section qui se dénombre annonce ce qu'elle contient. */
  denombre?: boolean;
}

const ONGLETS: Record<Tab, Onglet> = {
  profil: { label: 'Profil', icon: 'bi-person-vcard', groupe: 'identite' },

  // Côté recruteur
  offres: { label: 'Offres publiées', icon: 'bi-megaphone', groupe: 'activite', denombre: true },
  recues: { label: 'Candidatures reçues', icon: 'bi-inbox', groupe: 'activite', denombre: true },
  menes: { label: 'Entretiens menés', icon: 'bi-calendar-check', groupe: 'activite', denombre: true },

  // Côté candidat
  candidatures: { label: 'Candidatures', icon: 'bi-file-earmark-text', groupe: 'activite', denombre: true },
  recherches: { label: 'Alertes', icon: 'bi-bell', groupe: 'activite', denombre: true },
  entretiens: { label: 'Entretiens', icon: 'bi-calendar-event', groupe: 'activite', denombre: true },
  cv: { label: 'CV', icon: 'bi-file-person', groupe: 'activite', denombre: true },
  notes: { label: 'Notes', icon: 'bi-sticky', groupe: 'activite', denombre: true },

  securite: { label: 'Sécurité', icon: 'bi-shield-lock', groupe: 'gestion' },
  journal: { label: 'Journal', icon: 'bi-clock-history', groupe: 'gestion', denombre: true },
  compte: { label: 'Compte', icon: 'bi-gear', groupe: 'gestion' },
};

/** Ce qu'on vient consulter, selon le métier de la personne. */
const PAR_ROLE: Record<string, Tab[]> = {
  Candidate: ['profil', 'candidatures', 'recherches', 'entretiens', 'cv', 'notes', 'securite', 'journal', 'compte'],
  Recruiter: ['profil', 'offres', 'recues', 'menes', 'securite', 'journal', 'compte'],
  Admin: ['profil', 'securite', 'journal', 'compte'],
};

const GROUPES: { cle: 'identite' | 'activite' | 'gestion'; titre: string }[] = [
  { cle: 'identite', titre: 'Identité' },
  { cle: 'activite', titre: 'Activité' },
  { cle: 'gestion', titre: 'Gestion' },
];

const STATUS_LABELS: Record<string, string> = {
  Pending: 'En attente', Reviewed: 'Examinée', Contacted: 'Contactée',
  Accepted: 'Acceptée', Hired: 'Embauchée', Rejected: 'Refusée',
  Proposed: 'Proposé', Completed: 'Terminé', Cancelled: 'Annulé',
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'badge-yellow', Reviewed: 'badge-blue', Contacted: 'badge-blue',
  Accepted: 'badge-green', Hired: 'badge-green', Rejected: 'badge-red',
  Proposed: 'badge-yellow', Completed: 'badge-blue', Cancelled: 'badge-red',
};

/** Par quel moyen une session s'est ouverte, en francais. */
const MOYENS: Record<string, string> = {
  Password: 'Mot de passe',
  Google: 'Google',
  LinkedIn: 'LinkedIn',
  Recovery: 'Code de secours',
  Impersonation: 'Prise en main',
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

/**
 * Accord du libellé d'une mesure. En français zéro reste au singulier :
 * « 0 candidature », « 1 candidature », « 2 candidatures ».
 */
const pl = (n: number, singulier: string, pluriel: string) => (n < 2 ? singulier : pluriel);

/** Un chiffre du bandeau : sa valeur, ce qu'il compte, et pourquoi. */
interface Mesure {
  valeur: string;
  libelle: string;
  aide: string;
  /** Vers quelle section ce chiffre renvoie, quand il en a une. */
  vers?: Tab;
}

@Component({
  selector: 'app-admin-user-detail',
  imports: [RouterLink, FormsModule, DatePipe],
  templateUrl: './admin-user-detail.html',
  styleUrl: './admin-user-detail.scss',
})
export class AdminUserDetail implements OnInit {
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  onglets = ONGLETS;
  groupes = GROUPES;
  cvSections = CV_SECTIONS;
  companyColor = companyColor;
  /** Les CV passent par une route authentifiee : plus de lien nu. */
  fichiers = inject(FichiersService);
  statusLabel = (s: string) => STATUS_LABELS[s] ?? s;
  statusBadge = (s: string) => STATUS_BADGE[s] ?? '';
  roleLabel = (r: string) => ROLE_LABELS[r] ?? r;
  moyen = (m: string) => MOYENS[m] ?? m;

  dossier = signal<any>(null);
  loading = signal(true);
  saving = signal(false);

  /** La section demandée, qui n'est pas forcément une section offerte. */
  private demande = signal<Tab>('profil');

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

  // Côté recruteur
  offres = computed<any[]>(() => this.dossier()?.offresPubliees ?? []);
  recues = computed<any[]>(() => this.dossier()?.candidaturesRecues ?? []);
  menes = computed<any[]>(() => this.dossier()?.entretiensMenes ?? []);
  delaiReponse = computed<number | null>(() => this.dossier()?.delaiReponseJours ?? null);

  /** Ce que vaut la protection de ce compte, et ce qu'on peut y faire. */
  securite = computed<any>(() => this.dossier()?.securite ?? null);

  /** Un compte enfermé dehors par le compteur d'échecs. */
  estVerrouille = computed<boolean>(() => {
    const j = this.securite()?.verrouilleJusquA;
    return !!j && new Date(j).getTime() > Date.now();
  });

  /** Combien chaque section porte. */
  compteurs = computed<Record<Tab, number>>(() => ({
    profil: 0,
    offres: this.offres().length,
    recues: this.recues().length,
    menes: this.menes().length,
    candidatures: this.applications().length,
    recherches: this.savedSearches().length,
    entretiens: this.interviews().length,
    cv: this.cv().length,
    notes: this.notes().length,
    securite: 0,
    journal: this.activity().length,
    compte: 0,
  }));

  compteur = (t: Tab): number => this.compteurs()[t] ?? 0;

  /**
   * Les sections de ce dossier.
   *
   * Le rôle donne l'ordre attendu ; une section hors de cet ordre mais
   * qui porte quelque chose s'ajoute quand même. Un recruteur ayant
   * postulé à une offre ne doit pas voir sa candidature disparaître
   * parce que la convention ne l'attendait pas.
   */
  sections = computed<Tab[]>(() => {
    const u = this.user();
    if (!u) return ['profil'];
    const base = PAR_ROLE[u.role] ?? PAR_ROLE['Candidate'];
    const c = this.compteurs();
    const surplus = (Object.keys(ONGLETS) as Tab[]).filter((k) => !base.includes(k) && c[k] > 0);
    return [...base, ...surplus];
  });

  /** La section réellement ouverte : celle demandée si elle existe ici. */
  activeTab = computed<Tab>(() => {
    const d = this.demande();
    return this.sections().includes(d) ? d : 'profil';
  });

  sectionsDuGroupe = (g: string): Tab[] => this.sections().filter((t) => ONGLETS[t].groupe === g);

  /**
   * Le bandeau de mesures.
   *
   * Un taux d'acceptation de candidatures n'a aucun sens sur un
   * recruteur : il affichait « 0 % » sur des comptes qui n'ont jamais
   * postulé. Chaque métier a ses propres chiffres.
   */
  mesures = computed<Mesure[]>(() => {
    const u = this.user();
    if (!u) return [];

    if (u.role === 'Recruiter') {
      const offres = this.offres();
      const enLigne = offres.filter((o) => this.offreEnLigne(o)).length;
      const attente = this.recues().filter((a) => a.status === 'Pending').length;
      const delai = this.delaiReponse();
      return [
        { valeur: String(offres.length), libelle: pl(offres.length, 'offre publiée', 'offres publiées'), vers: 'offres',
          aide: 'Toutes les annonces déposées par ce compte, en ligne ou non.' },
        { valeur: String(enLigne), libelle: 'en ligne', vers: 'offres',
          aide: 'Approuvées, actives, non expirées : visibles du public en ce moment.' },
        { valeur: String(this.recues().length),
          libelle: pl(this.recues().length, 'candidature reçue', 'candidatures reçues'), vers: 'recues',
          aide: !this.recues().length ? "Personne n'a encore postulé à ces offres."
            : attente ? `Dont ${attente} encore sans décision.`
            : 'Toutes ont reçu une décision.' },
        { valeur: delai === null ? '—' : `${delai} j`, libelle: 'délai de réponse', vers: 'recues',
          aide: delai === null
            ? 'Aucune candidature lue : le délai ne se mesure pas encore.'
            : 'Temps moyen entre le dépôt et la lecture, sur les candidatures lues.' },
      ];
    }

    if (u.role === 'Admin') {
      const cnx = u.loginsLast30Days ?? 0;
      return [
        { valeur: String(this.activity().length),
          libelle: pl(this.activity().length, 'action au journal', 'actions au journal'), vers: 'journal',
          aide: 'Les 50 dernières actions enregistrées sous ce compte.' },
        { valeur: String(cnx), libelle: pl(cnx, 'connexion (30 j)', 'connexions (30 j)'),
          aide: 'Nombre de connexions sur le dernier mois.' },
        { valeur: this.fraicheur().jamais ? 'Jamais' : this.fraicheur().court, libelle: 'dernière visite',
          aide: this.fraicheur().texte },
      ];
    }

    const apps = this.applications();
    const acceptees = apps.filter((a) => a.status === 'Accepted').length;
    const attente = apps.filter((a) => a.status === 'Pending').length;
    const entretiens = this.interviews().length;
    const alertes = this.savedSearches().filter((s) => s.alertEnabled).length;
    return [
      { valeur: String(apps.length), libelle: pl(apps.length, 'candidature', 'candidatures'), vers: 'candidatures',
        aide: !apps.length ? "Ce compte n'a encore postulé à aucune offre."
          : attente ? `Dont ${attente} sans réponse du recruteur.`
          : 'Toutes ont reçu une réponse.' },
      { valeur: String(entretiens), libelle: pl(entretiens, 'entretien', 'entretiens'), vers: 'entretiens',
        aide: 'Entretiens proposés à cette personne, tous statuts confondus.' },
      { valeur: String(alertes), libelle: pl(alertes, 'alerte active', 'alertes actives'), vers: 'recherches',
        aide: 'Recherches enregistrées qui envoient un courriel.' },
      { valeur: apps.length ? `${Math.round((acceptees / apps.length) * 100)} %` : '—', libelle: 'acceptation',
        vers: 'candidatures',
        aide: apps.length
          ? `${acceptees} candidature${acceptees > 1 ? 's' : ''} acceptée${acceptees > 1 ? 's' : ''} sur ${apps.length}.`
          : 'Aucune candidature : le taux ne se calcule pas.' },
    ];
  });

  /**
   * Une offre est-elle réellement visible du public ?
   *
   * « Publiée » ne suffit pas : une offre peut être approuvée mais
   * expirée, active mais en brouillon, en ligne mais en attente de
   * modération. Le tableau doit dire lequel de ces cas s'applique.
   */
  offreEnLigne = (o: any): boolean =>
    !!o.isActive && !o.isDraft && o.moderationStatus === 'Approved' &&
    (!o.expiresAt || new Date(o.expiresAt).getTime() > Date.now());

  /** L'état d'une offre en un mot, et sa couleur. */
  etatOffre = (o: any): { texte: string; classe: string } => {
    if (o.isDraft) return { texte: 'Brouillon', classe: '' };
    if (o.moderationStatus === 'Pending') return { texte: 'En modération', classe: 'badge-yellow' };
    if (o.moderationStatus === 'Rejected') return { texte: 'Rejetée', classe: 'badge-red' };
    if (!o.isActive) return { texte: 'Retirée', classe: '' };
    if (o.expiresAt && new Date(o.expiresAt).getTime() <= Date.now())
      return { texte: 'Expirée', classe: 'badge-red' };
    return { texte: 'En ligne', classe: 'badge-green' };
  };

  /**
   * Fraîcheur du compte.
   *
   * « Ce compte sert-il encore ? » est la première question que pose une
   * fiche. La dernière connexion est déduite du journal, faute d'une
   * colonne dédiée. Le seuil de quatre-vingt-dix jours n'est pas une
   * alerte : c'est le moment où l'on peut dire qu'un compte dort.
   */
  fraicheur = computed(() => {
    const u = this.user();
    const iso: string | null = u?.lastLoginAt ?? null;
    if (!iso) return { jamais: true, texte: 'Jamais connecté', court: 'Jamais', dormant: true };

    const jours = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000));
    const texte =
      jours === 0 ? "Connecté aujourd'hui"
      : jours === 1 ? 'Connecté hier'
      : jours < 30 ? `Connecté il y a ${jours} jours`
      : jours < 365 ? `Connecté il y a ${Math.round(jours / 30)} mois`
      : `Connecté il y a plus d'un an`;
    const court =
      jours === 0 ? "Aujourd'hui" : jours === 1 ? 'Hier'
      : jours < 30 ? `${jours} j` : jours < 365 ? `${Math.round(jours / 30)} mois` : '+1 an';

    return { jamais: false, texte, court, dormant: jours > 90 };
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
    if (tab && ONGLETS[tab]) this.demande.set(tab);

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
    this.demande.set(tab);
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

  // ═══ Pièces du dossier ═══
  // Chaque ligne s'enregistre à son propre geste. Un bouton unique par
  // section laisserait croire à un état d'ensemble à valider, alors qu'il
  // s'agit d'enregistrements indépendants.

  /** Ligne en cours d'écriture, pour neutraliser ses commandes. */
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
    // Une candidature effacée ne se retrouve pas : on demande confirmation.
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

  /**
   * Déverrouille un compte que le compteur d'échecs a fermé.
   *
   * C'est le geste que l'on fait pour quelqu'un qui a mal saisi son mot de
   * passe cinq fois et qui appelle : sans lui, il faudrait attendre le
   * quart d'heure.
   */
  deverrouiller() {
    this.ecrire('sec', this.admin.deverrouiller(this.userId), 'Compte déverrouillé');
  }

  /**
   * Coupe la double authentification d'un compte.
   *
   * Recours de dernière extrémité : la personne a perdu son téléphone ET
   * ses codes de secours, et sans cela son compte serait clos pour
   * toujours. Le geste retire une protection : il se confirme, et il
   * s'inscrit au journal sous le nom de qui l'a fait.
   */
  async couper2fa() {
    const u = this.user();
    const res = await confirm(
      `Couper la double authentification de ${u.firstName} ${u.lastName} ?

`
      + `Son mot de passe suffira de nouveau pour entrer. Ne le faites que si `
      + `cette personne a perdu son telephone et ses codes de secours, et que `
      + `vous etes sur de lui parler. Elle en sera informee par courriel, et `
      + `votre nom restera au journal.`,
    );
    if (!res) return;
    this.ecrire('sec', this.admin.desactiver2fa(this.userId), 'Double authentification coupée');
  }

  /** Ferme tous les appareils connectés de ce compte. */
  async fermerSessions() {
    if (!confirm('Deconnecter tous les appareils de ce compte ?')) return;
    this.ecrire('sec', this.admin.fermerSessions(this.userId), 'Appareils déconnectés');
  }

  /**
   * Prend la main sur ce compte.
   *
   * On confirme d'abord : agir sous l'identité de quelqu'un donne accès à
   * ses messages privés et permet d'agir en son nom. Ce n'est pas un
   * geste qu'on fait par mégarde.
   */
  prendreEnMain() {
    const u = this.user();
    if (!u) return;

    const ok = confirm(
      `Prendre la main sur le compte de ${u.firstName} ${u.lastName} ?\n\n`
      + `Vous agirez en son nom pendant 30 minutes. Vos actions seront `
      + `enregistrées au journal sous votre propre identité.`,
    );
    if (!ok) return;

    this.saving.set(true);
    this.auth.prendreEnMain(this.userId).subscribe({
      next: () => {
        this.saving.set(false);
        // On quitte l'administration : le jeton ne l'ouvre plus.
        this.router.navigate(['/']);
      },
      error: (e) => {
        this.toastr.error(e?.error?.message ?? 'Prise en main impossible');
        this.saving.set(false);
      },
    });
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
