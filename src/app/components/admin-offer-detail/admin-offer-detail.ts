import { Component, OnInit, HostListener, inject, signal, computed } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe, DecimalPipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { JobOfferService } from '../../services/job-offer';
import { AdminService } from '../../services/admin.service';
import { JobOffer } from '../../models/job-offer.model';
import { companyColor, salaryLabel } from '../../utils/job.utils';
import { estEmployeurAnonyme } from '../../pipes/employer-name.pipe';
import { MODERATION_STATUS, STATUS } from '../../viz/palette';

/**
 * Fiche d'offre dans l'administration.
 *
 * Le tableau des offres renvoyait vers la fiche publique. On quittait donc
 * la console pour une page de vitrine — sans les compteurs, sans l'état de
 * modération, sans rien pouvoir corriger — et il fallait revenir en
 * arrière puis passer par l'espace recruteur pour changer une virgule.
 *
 * Cette page réunit les deux : ce que l'offre est, et ce qu'on peut en
 * faire. Tout tient sur un écran, sans étapes — un formulaire d'annonce
 * n'est pas un tunnel, on y revient pour corriger un champ précis, pas
 * pour le remplir de bout en bout. Les blocs sont là pour guider l'œil,
 * pas pour enfermer la saisie.
 */

/** Un bloc du formulaire : titre, explication, et son ancre dans le sommaire. */
interface Bloc {
  cle: string;
  titre: string;
  icone: string;
}

const BLOCS: Bloc[] = [
  { cle: 'poste', titre: 'Le poste', icone: 'bi-briefcase' },
  { cle: 'lieu', titre: 'Lieu et organisation', icone: 'bi-geo-alt' },
  { cle: 'remuneration', titre: 'Rémunération', icone: 'bi-cash-stack' },
  { cle: 'description', titre: 'Description', icone: 'bi-file-text' },
  { cle: 'candidature', titre: 'Candidature', icone: 'bi-send' },
  { cle: 'publication', titre: 'Publication', icone: 'bi-broadcast' },
];

/** Les champs que l'API accepte en modification, et rien d'autre. */
const CHAMPS_MODIFIABLES = [
  'title', 'company', 'location', 'description', 'contractType', 'salary', 'category',
  'isRemote', 'expiresAt', 'companyLogoUrl', 'tags', 'minSalary', 'maxSalary',
  'experienceRequired', 'educationLevel', 'benefits', 'workSchedule', 'languages',
  'companyDescription', 'isUrgent', 'easyApply', 'screeningQuestions', 'autoReplyMessage',
  'openings', 'workplaceType', 'address', 'salaryPeriod', 'supplementalPay',
  'contractDuration', 'hoursPerWeek', 'startDate', 'applicationEmail', 'requireResume',
  'isDraft', 'isActive',
] as const;

type ChampModifiable = (typeof CHAMPS_MODIFIABLES)[number];
type Formulaire = Record<string, any>;

const CONTRATS = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance', 'Interim'];
const EXPERIENCES = ['Junior', 'Intermediaire', 'Senior', 'Expert'];
const DIPLOMES = ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'];
const HORAIRES = ['Temps plein', 'Temps partiel', 'Journee', 'Nuit', 'Week-end'];
const LIEUX_TRAVAIL = ['Sur site', 'Hybride', 'Teletravail'];
const PERIODES = [
  { cle: 'an', label: 'par an' },
  { cle: 'mois', label: 'par mois' },
  { cle: 'heure', label: 'par heure' },
];

@Component({
  selector: 'app-admin-offer-detail',
  imports: [RouterLink, FormsModule, DatePipe, DecimalPipe],
  templateUrl: './admin-offer-detail.html',
  styleUrl: './admin-offer-detail.scss',
})
export class AdminOfferDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobOfferService);
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  readonly blocs = BLOCS;
  readonly contrats = CONTRATS;
  readonly experiences = EXPERIENCES;
  readonly diplomes = DIPLOMES;
  readonly horaires = HORAIRES;
  readonly lieuxTravail = LIEUX_TRAVAIL;
  readonly periodes = PERIODES;
  readonly ETAT = STATUS;

  companyColor = companyColor;
  salaryLabel = salaryLabel;
  employeurAnonyme = estEmployeurAnonyme;

  offre = signal<JobOffer | null>(null);
  loading = signal(true);
  failed = signal(false);
  saving = signal(false);
  moderating = signal(false);

  /** Saisie en cours, et l'état servi par le serveur pour la comparer. */
  form: Formulaire = {};
  private origine: Formulaire = {};

  private id = 0;

  ngOnInit() {
    this.id = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.id) {
      this.router.navigate(['/admin/offres']);
      return;
    }
    this.charger();
  }

  private charger() {
    this.loading.set(true);
    this.failed.set(false);
    this.jobService.getById(this.id).subscribe({
      next: (o) => {
        this.offre.set(o);
        this.hydrater(o);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.failed.set(true);
      },
    });
  }

  private hydrater(o: JobOffer) {
    const etat: Formulaire = {};
    for (const c of CHAMPS_MODIFIABLES) {
      const v = (o as any)[c];
      // Les dates arrivent en ISO complet ; les champs `date` du navigateur
      // n'acceptent que « aaaa-mm-jj » et refusent silencieusement le reste.
      etat[c] = this.estChampDate(c) ? this.versDateInput(v) : (v ?? this.defautDe(c));
    }
    this.form = { ...etat };
    this.origine = { ...etat };
  }

  private estChampDate = (c: string) => c === 'expiresAt' || c === 'startDate';

  private versDateInput(v: unknown): string {
    if (!v) return '';
    const d = new Date(v as string);
    return isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
  }

  private defautDe(c: ChampModifiable): any {
    if (['isRemote', 'isUrgent', 'easyApply', 'requireResume', 'isDraft'].includes(c)) return false;
    if (c === 'isActive') return true;
    if (c === 'openings') return 1;
    if (['minSalary', 'maxSalary', 'hoursPerWeek'].includes(c)) return null;
    return '';
  }

  // ══ Modifications en attente ══

  /**
   * Un getter, pas un `computed` : `form` est un objet ordinaire, pas un
   * signal — un `computed` ne serait jamais recalculé et la barre
   * d'enregistrement ne paraîtrait jamais.
   */
  get isDirty(): boolean {
    return !this.verrouille && this.champsModifies.length > 0;
  }

  get champsModifies(): string[] {
    return Object.keys(this.origine).filter(
      (k) => (this.form[k] ?? '') !== (this.origine[k] ?? ''),
    );
  }

  annuler() {
    this.form = { ...this.origine };
    this.toastr.info('Modifications annulées');
  }

  /** Fermer l'onglet en pleine saisie effaçait tout sans un mot. */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent) {
    if (this.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  enregistrer() {
    if (this.verrouille || !this.isDirty || this.saving()) return;
    this.saving.set(true);

    // Les dates repartent en ISO ; une chaîne vide vaut « pas de date »,
    // et non le 1er janvier 1970.
    const charge: Formulaire = { ...this.form };
    for (const c of ['expiresAt', 'startDate']) {
      charge[c] = charge[c] ? new Date(charge[c]).toISOString() : null;
    }
    for (const c of ['minSalary', 'maxSalary', 'hoursPerWeek']) {
      charge[c] = charge[c] === '' || charge[c] === null ? null : Number(charge[c]);
    }

    this.jobService.update(this.id, charge as Partial<JobOffer>).subscribe({
      next: () => {
        this.saving.set(false);
        this.origine = { ...this.form };
        this.toastr.success('Offre enregistrée');
        // La modération a pu changer côté serveur : une offre modifiée
        // par un recruteur repasse en attente. On relit plutôt que de
        // supposer.
        this.jobService.getById(this.id).subscribe((o) => this.offre.set(o));
      },
      error: (err) => {
        this.saving.set(false);
        this.toastr.error(err.error?.message || "L'offre n'a pas pu être enregistrée.");
      },
    });
  }

  // ══ Modération ══

  etatModeration = computed(() => {
    const s = this.offre()?.moderationStatus || 'Pending';
    return MODERATION_STATUS[s] ?? MODERATION_STATUS['Pending'];
  });

  approuver() {
    this.moderating.set(true);
    this.admin.approveOffer(this.id).subscribe({
      next: () => {
        this.moderating.set(false);
        this.toastr.success('Offre approuvée');
        this.jobService.getById(this.id).subscribe((o) => this.offre.set(o));
      },
      error: () => { this.moderating.set(false); this.toastr.error('Erreur'); },
    });
  }

  async rejeter() {
    const res = await Swal.fire({
      title: 'Rejeter cette offre ?',
      input: 'textarea',
      inputLabel: 'Motif communiqué au recruteur',
      inputPlaceholder: 'Ce qui doit être corrigé…',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Rejeter',
      cancelButtonText: 'Annuler',
      inputValidator: (v) => (!v || !v.trim() ? 'Un rejet sans motif ne dit pas quoi corriger.' : null),
    });
    if (!res.isConfirmed) return;

    this.moderating.set(true);
    this.admin.rejectOffer(this.id, res.value).subscribe({
      next: () => {
        this.moderating.set(false);
        this.toastr.success('Offre rejetée');
        this.jobService.getById(this.id).subscribe((o) => this.offre.set(o));
      },
      error: () => { this.moderating.set(false); this.toastr.error('Erreur'); },
    });
  }

  basculerMiseEnAvant() {
    this.admin.toggleFeature(this.id).subscribe({
      next: () => {
        this.toastr.success('Mise en avant modifiée');
        this.jobService.getById(this.id).subscribe((o) => this.offre.set(o));
      },
      error: () => this.toastr.error('Erreur'),
    });
  }

  // ══ Repères affichés ══

  get importee(): boolean {
    return !!this.offre()?.externalSource;
  }

  /**
   * Le contenu d'une offre reprise chez un partenaire ne se modifie pas.
   *
   * Ce n'est pas notre texte : France Travail en reste la source de
   * vérité, et l'annonce d'origine reste en ligne. La réécrire ici
   * ferait lire au candidat un intitulé ou un salaire que l'employeur
   * n'a jamais écrits, que l'annonce d'origine contredirait aussitôt.
   *
   * Le serveur refuse de son côté : ce verrou-ci n'est là que pour
   * l'expliquer et éviter une saisie perdue.
   *
   * Ce qui reste possible relève de nos décisions d'affichage, pas de
   * son contenu : approuver, rejeter, mettre en avant.
   */
  get verrouille(): boolean {
    return this.importee;
  }

  /** Nom lisible du partenaire, pour le dire plutôt que d'afficher une clé. */
  get partenaire(): string {
    const s = this.offre()?.externalSource ?? '';
    return { francetravail: 'France Travail', arbeitnow: 'Arbeitnow', remotive: 'Remotive' }[s] ?? s;
  }

  get nbCandidatures(): number {
    return (this.offre() as any)?.applications?.length ?? 0;
  }

  /**
   * Rémunération invraisemblable — même règle que la liste : au-delà de
   * 200 000 € annuels ou sous 3 000 €, c'est l'analyse du libellé source
   * qui est fausse, pas le marché.
   */
  get salaireSuspect(): boolean {
    if ((this.form['salaryPeriod'] || 'an') !== 'an') return false;
    return [this.form['minSalary'], this.form['maxSalary']]
      .filter((v) => v != null && v !== '')
      .map(Number)
      .some((v) => v < 3_000 || v >= 200_000);
  }

  /** Une annonce trop courte n'est pas éligible aux résultats d'emploi de Google. */
  get descriptionCourte(): boolean {
    return (this.form['description'] || '').trim().length < 120;
  }

  faireDefiler(cle: string) {
    document.getElementById('bloc-' + cle)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
