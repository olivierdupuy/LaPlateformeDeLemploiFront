import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer';
import { AuthService } from '../../services/auth.service';
import { PlatformService } from '../../services/platform.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ConsoleShell } from '../console-shell/console-shell';
import { MarkdownPipe } from '../../utils/markdown.pipe';
import {
  SCREENING_TYPE_LABELS,
  ScreeningQuestion,
  ScreeningType,
  answerOptions,
  emptyQuestion,
  parseScreeningQuestions,
  serializeScreeningQuestions,
} from '../../utils/screening';

interface Step {
  key: string;
  label: string;
  icon: string;
}

/**
 * Tunnel de depot d'une offre, en sept etapes : le poste, le lieu, le contrat,
 * la remuneration, la description, la reception des candidatures, puis l'apercu
 * de l'annonce telle que la verront les candidats.
 *
 * Chaque etape est validee avant la suivante ; l'offre peut etre mise de cote
 * en brouillon a tout moment (invisible des candidats, reprise depuis « Mes offres »).
 */
@Component({
  selector: 'app-job-form',
  imports: [FormsModule, RouterLink, ConsoleShell, MarkdownPipe],
  templateUrl: './job-form.html',
  styleUrl: './job-form.scss',
})
export class JobForm implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobOfferService);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);
  private platform = inject(PlatformService);

  isEdit = signal(false);
  wasDraft = signal(false);
  jobId = 0;
  submitting = signal(false);
  savingDraft = signal(false);
  stepIndex = signal(0);
  errors = signal<string[]>([]);

  form: any = {
    // Le poste
    title: '', company: '', openings: 1, category: 'Tech',
    // Lieu de travail
    workplaceType: 'Sur site', location: '', address: '', isRemote: false,
    // Contrat
    contractType: 'CDI', contractDuration: '', workSchedule: 'Temps plein',
    hoursPerWeek: null, startDate: '', experienceRequired: '', educationLevel: '', languages: '',
    // Rémunération
    minSalary: null, maxSalary: null, salaryPeriod: 'an', salary: '',
    supplementalPay: '', benefits: '',
    // Description
    description: '', companyDescription: '', tags: '',
    // Candidatures
    applicationEmail: '', requireResume: true, easyApply: true, autoReplyMessage: '',
    isUrgent: false, expiresAt: '', isActive: true,
  };

  readonly steps: Step[] = [
    { key: 'poste', label: 'Le poste', icon: 'bi-briefcase' },
    { key: 'lieu', label: 'Lieu', icon: 'bi-geo-alt' },
    { key: 'contrat', label: 'Contrat', icon: 'bi-file-earmark-ruled' },
    { key: 'salaire', label: 'Rémunération', icon: 'bi-cash-coin' },
    { key: 'description', label: 'Description', icon: 'bi-card-text' },
    { key: 'candidatures', label: 'Candidatures', icon: 'bi-inbox' },
    { key: 'apercu', label: 'Aperçu', icon: 'bi-eye' },
  ];

  /**
   * Ce qui manque a l'offre pour etre lisible dans une liste.
   *
   * Ce ne sont pas les champs obligatoires du formulaire — ceux-la sont
   * deja verifies a chaque etape — mais ceux dont l'absence coute des
   * candidatures. Le salaire en tete : c'est le premier filtre applique
   * par les candidats, et une offre sans fourchette sort des recherches
   * qui en posent une.
   *
   * Accesseur et non `computed` : `form` est un objet ordinaire, pas un
   * signal. Un calcul memorise ne verrait jamais ses mutations et
   * afficherait indefiniment la liste du premier rendu — « l'intitule
   * manque » alors qu'on vient de le saisir.
   */
  get previewGaps(): { key: string; text: string }[] {
    const f = this.form;
    const out: { key: string; text: string }[] = [];
    if (!f.title) out.push({ key: 'title', text: "L'intitulé du poste" });
    if (!f.location) out.push({ key: 'loc', text: 'La ville — les candidats filtrent par lieu' });
    if (!this.salaryPreview) out.push({ key: 'sal', text: 'Le salaire — une offre sans fourchette sort des recherches qui en posent une' });
    if (!f.description || f.description.length < 120) out.push({ key: 'desc', text: 'Une description d\'au moins quelques lignes' });
    if (!f.benefits) out.push({ key: 'ben', text: 'Les avantages — ils se comparent d\'une offre à l\'autre' });
    return out;
  }

  currentStep = computed(() => this.steps[this.stepIndex()].key);
  progress = computed(() => Math.round(((this.stepIndex() + 1) / this.steps.length) * 100));
  isLastStep = computed(() => this.stepIndex() === this.steps.length - 1);

  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
  categories = ['Tech', 'Design', 'Marketing', 'Finance', 'Data', 'RH'];
  experienceLevels = ['Junior', 'Intermediaire', 'Senior', 'Expert'];
  educationLevels = ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'];
  workSchedules = ['Temps plein', 'Temps partiel', 'Journee', 'Nuit', 'Week-end'];
  workplaceTypes = ['Sur site', 'Hybride', 'Télétravail'];
  salaryPeriods = [
    { value: 'an', label: 'par an' },
    { value: 'mois', label: 'par mois' },
    { value: 'heure', label: 'par heure' },
  ];
  /** Avantages proposés en un clic, plutôt qu'une saisie libre à l'aveugle. */
  commonBenefits = [
    'Télétravail', 'Tickets restaurant', 'Mutuelle', 'RTT', 'Prise en charge du transport',
    'Participation', 'Formation', 'Crèche', 'Salle de sport', 'Horaires flexibles',
  ];
  commonSupplementalPay = ['13e mois', 'Primes sur objectifs', 'Prime annuelle', 'Commissions', 'Heures supplémentaires majorées'];

  screeningQuestionsList: ScreeningQuestion[] = [];
  screeningTypeLabels = SCREENING_TYPE_LABELS;
  screeningTypes: ScreeningType[] = ['text', 'boolean', 'number', 'choice'];
  answerOptions = answerOptions;

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u?.company) this.form.company = u.company;
    if (u?.email) this.form.applicationEmail = u.email;

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit.set(true);
      this.jobId = Number(id);
      this.jobService.getById(this.jobId).subscribe({
        next: (job) => {
          this.wasDraft.set(!!job.isDraft);
          this.form = {
            title: job.title, company: job.company, openings: job.openings || 1, category: job.category,
            workplaceType: job.workplaceType || (job.isRemote ? 'Télétravail' : 'Sur site'),
            location: job.location, address: job.address || '', isRemote: job.isRemote,
            contractType: job.contractType, contractDuration: job.contractDuration || '',
            workSchedule: job.workSchedule || 'Temps plein', hoursPerWeek: job.hoursPerWeek ?? null,
            startDate: this.toDateInput(job.startDate),
            experienceRequired: job.experienceRequired || '', educationLevel: job.educationLevel || '',
            languages: job.languages || '',
            minSalary: job.minSalary ?? null, maxSalary: job.maxSalary ?? null,
            salaryPeriod: job.salaryPeriod || 'an', salary: job.salary || '',
            supplementalPay: job.supplementalPay || '', benefits: job.benefits || '',
            description: job.description, companyDescription: job.companyDescription || '',
            tags: job.tags || '',
            applicationEmail: job.applicationEmail || '', requireResume: job.requireResume !== false,
            easyApply: job.easyApply ?? true, autoReplyMessage: job.autoReplyMessage || '',
            isUrgent: job.isUrgent || false, expiresAt: this.toDateInput(job.expiresAt),
            // Un brouillon est inactif tant qu'il n'est pas publie : reprendre
            // sa valeur telle quelle le publierait invisible.
            isActive: job.isDraft ? true : job.isActive,
          };
          this.screeningQuestionsList = parseScreeningQuestions(job.screeningQuestions);
        },
        error: () => { this.toastr.error('Offre introuvable'); this.router.navigate(['/recruteur/offres']); },
      });
    }
  }

  private toDateInput(iso?: string): string {
    return iso ? iso.substring(0, 10) : '';
  }

  // ── Navigation ──

  goStep(index: number) {
    if (index > this.stepIndex() && !this.validateUpTo(index)) return;
    this.stepIndex.set(Math.max(0, Math.min(index, this.steps.length - 1)));
    this.errors.set([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  nextStep() {
    if (!this.validateStep(this.stepIndex())) return;
    this.goStep(this.stepIndex() + 1);
  }

  prevStep() {
    this.errors.set([]);
    if (this.stepIndex() > 0) this.stepIndex.update((s) => s - 1);
  }

  // ── Validation ──

  private validateUpTo(target: number): boolean {
    for (let i = this.stepIndex(); i < target; i++) {
      if (!this.validateStep(i)) {
        // On se pose sur l'etape fautive : sinon le message reproche un champ
        // vide que l'ecran affiche ne montre meme pas.
        this.stepIndex.set(i);
        return false;
      }
    }
    return true;
  }

  private validateStep(index: number): boolean {
    const problems: string[] = [];
    switch (this.steps[index].key) {
      case 'poste':
        if (!this.form.title?.trim()) problems.push("L'intitulé du poste est obligatoire.");
        if (!this.form.company?.trim()) problems.push("Le nom de l'entreprise est obligatoire.");
        if (this.form.openings < 1) problems.push('Le nombre de postes doit être au moins de 1.');
        break;
      case 'lieu':
        if (!this.form.location?.trim()) problems.push('La ville ou la région du poste est obligatoire.');
        break;
      case 'contrat':
        if (this.form.hoursPerWeek != null && (this.form.hoursPerWeek < 1 || this.form.hoursPerWeek > 60))
          problems.push('Le nombre d’heures hebdomadaires doit être compris entre 1 et 60.');
        break;
      case 'salaire':
        if (this.form.minSalary != null && this.form.maxSalary != null && this.form.minSalary > this.form.maxSalary)
          problems.push('Le salaire minimum ne peut pas dépasser le salaire maximum.');
        break;
      case 'description':
        if (!this.form.description?.trim()) problems.push('La description du poste est obligatoire.');
        else if (this.form.description.trim().length < 80)
          problems.push('Décrivez le poste en quelques lignes (80 caractères minimum) : les annonces trop courtes attirent peu de candidats.');
        break;
      case 'candidatures':
        if (this.form.applicationEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.form.applicationEmail))
          problems.push("L'adresse de réception des candidatures n'est pas valide.");
        this.screeningQuestionsList.forEach((q, i) => {
          if (!q.text.trim()) problems.push(`La question ${i + 1} est vide.`);
          if (q.type === 'choice' && q.options.filter((o) => o.trim()).length < 2)
            problems.push(`La question ${i + 1} doit proposer au moins deux réponses.`);
        });
        break;
    }
    this.errors.set(problems);
    return problems.length === 0;
  }

  // ── Champs à cocher (avantages, primes) ──

  private listFrom(value: string): string[] {
    return (value || '').split(',').map((v) => v.trim()).filter(Boolean);
  }

  hasBenefit(b: string): boolean { return this.listFrom(this.form.benefits).includes(b); }
  toggleBenefit(b: string) { this.form.benefits = this.toggleIn(this.form.benefits, b); }
  hasSupplemental(p: string): boolean { return this.listFrom(this.form.supplementalPay).includes(p); }
  toggleSupplemental(p: string) { this.form.supplementalPay = this.toggleIn(this.form.supplementalPay, p); }

  private toggleIn(value: string, item: string): string {
    const list = this.listFrom(value);
    const i = list.indexOf(item);
    if (i >= 0) list.splice(i, 1);
    else list.push(item);
    return list.join(', ');
  }

  // ── Questions de présélection ──

  addQuestion() { this.screeningQuestionsList.push(emptyQuestion()); }
  removeQuestion(i: number) { this.screeningQuestionsList.splice(i, 1); }

  onQuestionTypeChange(q: ScreeningQuestion) {
    // La réponse idéale et les options dépendent du type : on repart à zéro
    // plutôt que de laisser un « Oui » attendu sur une question numérique.
    q.idealAnswer = '';
    if (q.type === 'choice' && q.options.length === 0) q.options = ['', ''];
    if (q.type !== 'choice') q.options = [];
  }

  addOption(q: ScreeningQuestion) { q.options.push(''); }
  removeOption(q: ScreeningQuestion, i: number) { q.options.splice(i, 1); }
  trackByIndex(index: number) { return index; }

  // ── Aperçu ──

  get previewTags(): string[] { return this.listFrom(this.form.tags); }
  get previewBenefits(): string[] { return this.listFrom(this.form.benefits); }
  get previewSupplemental(): string[] { return this.listFrom(this.form.supplementalPay); }
  get previewLanguages(): string[] { return this.listFrom(this.form.languages); }

  get salaryPreview(): string {
    const suffix = { an: 'par an', mois: 'par mois', heure: 'par heure' }[this.form.salaryPeriod as string] || '';
    if (this.form.minSalary && this.form.maxSalary)
      return `${this.form.minSalary} € – ${this.form.maxSalary} € ${suffix}`;
    if (this.form.minSalary) return `À partir de ${this.form.minSalary} € ${suffix}`;
    if (this.form.maxSalary) return `Jusqu'à ${this.form.maxSalary} € ${suffix}`;
    return this.form.salary || '';
  }

  get isAdmin(): boolean { return this.auth.isAdmin(); }
  get showModerationNotice(): boolean { return this.platform.requireModeration && !this.isAdmin; }

  // ── Enregistrement ──

  private buildPayload(isDraft: boolean) {
    return {
      ...this.form,
      openings: Number(this.form.openings) || 1,
      hoursPerWeek: this.form.hoursPerWeek ? Number(this.form.hoursPerWeek) : null,
      // Le drapeau télétravail alimente les filtres de recherche : il découle
      // du type de lieu de travail choisi ici.
      isRemote: this.form.workplaceType === 'Télétravail' || this.form.workplaceType === 'Hybride',
      startDate: this.form.startDate || null,
      expiresAt: this.form.expiresAt || null,
      screeningQuestions: serializeScreeningQuestions(this.screeningQuestionsList),
      isDraft,
    };
  }

  /** Toutes les étapes obligatoires, quel que soit l'endroit où l'on se trouve. */
  private validateAll(): boolean {
    for (let i = 0; i < this.steps.length; i++) {
      if (!this.validateStep(i)) {
        this.stepIndex.set(i);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return false;
      }
    }
    return true;
  }

  saveDraft() {
    // Un brouillon n'a pas à être complet, mais il lui faut un intitulé pour
    // être retrouvable dans « Mes offres ».
    if (!this.form.title?.trim()) {
      this.errors.set(["Donnez au moins un intitulé au poste pour enregistrer un brouillon."]);
      this.stepIndex.set(0);
      return;
    }
    if (!this.form.company?.trim()) this.form.company = this.auth.currentUser()?.company || 'Mon entreprise';
    if (!this.form.location?.trim()) this.form.location = 'À préciser';
    if (!this.form.description?.trim()) this.form.description = 'Description à rédiger.';

    this.savingDraft.set(true);
    const payload = this.buildPayload(true);
    const done = () => {
      this.savingDraft.set(false);
      this.toastr.success('Brouillon enregistré. Reprenez-le quand vous voulez depuis « Mes offres ».');
      this.router.navigate(['/recruteur/offres']);
    };
    const fail = () => { this.savingDraft.set(false); this.toastr.error("Échec de l'enregistrement du brouillon"); };

    if (this.isEdit()) this.jobService.update(this.jobId, payload).subscribe({ next: done, error: fail });
    else this.jobService.create(payload).subscribe({ next: done, error: fail });
  }

  submit() {
    if (!this.validateAll()) return;

    this.submitting.set(true);
    const payload = this.buildPayload(false);

    if (this.isEdit()) {
      this.jobService.update(this.jobId, payload).subscribe({
        next: () => {
          this.submitting.set(false);
          if (this.showModerationNotice) {
            Swal.fire({
              icon: 'info',
              title: 'Offre soumise a moderation',
              text: 'Votre offre a ete renvoyee en moderation. Elle sera visible apres validation par un administrateur.',
              confirmButtonColor: '#15616d',
            }).then(() => this.router.navigate(['/recruteur/offres']));
          } else {
            this.toastr.success(this.wasDraft() ? 'Offre publiée' : 'Offre mise à jour');
            this.router.navigate(['/offres', this.jobId]);
          }
        },
        error: () => { this.submitting.set(false); this.toastr.error('Erreur'); },
      });
    } else {
      this.jobService.create(payload).subscribe({
        next: (job) => {
          this.submitting.set(false);
          if (this.showModerationNotice) {
            Swal.fire({
              icon: 'info',
              title: 'Offre soumise a moderation',
              html: '<p>Votre offre a bien ete envoyee.</p><p>Elle sera <strong>visible par les candidats</strong> une fois validee par un administrateur.</p><p style="margin-top:8px;font-size:13px;color:#577177">Vous serez notifie lorsque votre offre sera approuvee.</p>',
              confirmButtonColor: '#15616d',
              confirmButtonText: 'Compris',
            }).then(() => this.router.navigate(['/recruteur/offres']));
          } else {
            Swal.fire({
              icon: 'success',
              title: 'Offre publiée !',
              text: 'Votre offre est maintenant visible par les candidats.',
              confirmButtonColor: '#15616d',
            }).then(() => this.router.navigate(['/offres', job.id]));
          }
        },
        error: () => { this.submitting.set(false); this.toastr.error('Erreur lors de la creation'); },
      });
    }
  }
}
