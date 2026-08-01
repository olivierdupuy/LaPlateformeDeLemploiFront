import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { JobOfferService } from '../../services/job-offer';
import { ApplicationService } from '../../services/application';
import { UploadService } from '../../services/upload.service';
import { AuthService } from '../../services/auth.service';
import { JobOffer } from '../../models/job-offer.model';
import { ScreeningQuestion, answerOptions, parseScreeningQuestions } from '../../utils/screening';
import { EmployerNamePipe } from '../../pipes/employer-name.pipe';
import { companyColor, getContractBadgeClass, salaryLabel } from '../../utils/job.utils';
import { FichiersService } from '../../utils/fichiers';
import { AuthModalService } from '../../services/auth-modal.service';

type StepKey = 'contact' | 'resume' | 'questions' | 'letter' | 'extras' | 'review';
type ResumeChoice = 'profile' | 'upload' | 'none';

interface Step {
  key: StepKey;
  label: string;
  icon: string;
}

/** Etat sauvegarde localement pour reprendre une candidature interrompue. */
interface ApplyDraft {
  form: ApplyForm;
  answers: string[];
  step: number;
  savedAt: string;
}

interface ApplyForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  city: string;
  coverLetter: string;
  availableFrom: string;
  salaryExpectation: string;
}

const DRAFT_PREFIX = 'lpde.candidature.';

/**
 * Tunnel de candidature d'une offre publiee sur la plateforme.
 *
 * Les offres importees (France Travail et autres partenaires) ne passent pas
 * par ici : elles se traitent sur le site d'origine, la fiche renvoie vers son
 * formulaire. Le tunnel deroule coordonnees → CV → questions du recruteur →
 * lettre → informations complementaires → verification, et conserve un
 * brouillon local a chaque etape.
 */
@Component({
  selector: 'app-apply-flow',
  imports: [RouterLink, FormsModule, DatePipe, EmployerNamePipe],
  templateUrl: './apply-flow.html',
  styleUrl: './apply-flow.scss',
})
export class ApplyFlow implements OnInit {
  authModale = inject(AuthModalService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private jobService = inject(JobOfferService);
  private appService = inject(ApplicationService);
  private uploadService = inject(UploadService);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);

  job = signal<JobOffer | null>(null);
  loading = signal(true);
  submitting = signal(false);
  /** Candidature deja envoyee : soit trouvee au chargement, soit envoyee a l'instant. */
  alreadyApplied = signal(false);
  sent = signal(false);
  similarJobs = signal<JobOffer[]>([]);
  draftRestored = signal(false);

  stepIndex = signal(0);
  questions = signal<ScreeningQuestion[]>([]);
  answers = signal<string[]>([]);

  resumeChoice = signal<ResumeChoice>('profile');
  uploadedResumeUrl = signal<string | null>(null);
  uploadedFileName = signal<string | null>(null);
  uploading = signal(false);

  errors = signal<string[]>([]);
  readonly today = new Date();

  form: ApplyForm = {
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    city: '',
    coverLetter: '',
    availableFrom: '',
    salaryExpectation: '',
  };

  answerOptions = answerOptions;
  companyColor = companyColor;
  getContractBadgeClass = getContractBadgeClass;

  private readonly allSteps: Step[] = [
    { key: 'contact', label: 'Coordonnées', icon: 'bi-person-vcard' },
    { key: 'resume', label: 'CV', icon: 'bi-file-earmark-text' },
    { key: 'questions', label: 'Questions', icon: 'bi-patch-question' },
    { key: 'letter', label: 'Lettre', icon: 'bi-envelope-paper' },
    { key: 'extras', label: 'Informations', icon: 'bi-sliders2' },
    { key: 'review', label: 'Vérification', icon: 'bi-check2-square' },
  ];

  /** L'etape « Questions » disparait quand le recruteur n'en pose aucune. */
  steps = computed(() => this.allSteps.filter((s) => s.key !== 'questions' || this.questions().length > 0));
  currentStep = computed<StepKey>(() => this.steps()[this.stepIndex()]?.key ?? 'contact');
  progress = computed(() => Math.round(((this.stepIndex() + 1) / this.steps().length) * 100));
  isLastStep = computed(() => this.stepIndex() === this.steps().length - 1);

  ngOnInit() {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.router.navigate(['/offres']);
      return;
    }

    if (!this.auth.isLoggedIn()) {
      // La modale s'ouvre par-dessus l'offre et y ramene une fois
      // l'identite etablie : on ne perd plus l'annonce en chemin.
      this.toastr.info('Connectez-vous pour postuler à cette offre.');
      this.authModale.ouvrir('connexion', { redirect: `/offres/${id}/postuler` });
      this.router.navigate(['/offres', id]);
      return;
    }

    this.jobService.getById(id).subscribe({
      next: (job) => {
        // Une offre partenaire se candidate sur son site : le tunnel n'a pas
        // de prise dessus, on renvoie a la fiche qui porte le bon lien.
        if (job.externalUrl || job.externalSource) {
          this.toastr.info("Cette offre se candidate sur le site du partenaire.");
          this.router.navigate(['/offres', id]);
          return;
        }
        this.job.set(job);
        this.questions.set(parseScreeningQuestions(job.screeningQuestions));
        this.answers.set(this.questions().map(() => ''));
        this.prefillFromProfile();
        this.restoreDraft(id);
        this.loading.set(false);
        this.loadSimilar(job);
      },
      error: () => {
        this.toastr.error('Offre introuvable');
        this.router.navigate(['/offres']);
      },
    });

    if (this.isCandidate) {
      this.appService.trackMy().subscribe({
        next: (apps) => this.alreadyApplied.set(apps.some((a) => a.jobOfferId === id)),
        error: () => {},
      });
    }
  }

  get isCandidate(): boolean {
    return this.auth.currentUser()?.role === 'Candidate';
  }

  get profileResumeUrl(): string | undefined {
    return this.auth.currentUser()?.resumeUrl || undefined;
  }

  /** Les CV passent par une route authentifiee : plus de lien nu. */
  fichiers = inject(FichiersService);

  /** CV effectivement joint a la candidature, selon le choix de l'etape 2. */
  get selectedResumeUrl(): string | undefined {
    if (this.resumeChoice() === 'none') return undefined;
    if (this.resumeChoice() === 'upload') return this.uploadedResumeUrl() || undefined;
    return this.profileResumeUrl;
  }

  get resumeRequired(): boolean {
    return this.job()?.requireResume !== false;
  }

  private prefillFromProfile() {
    const u = this.auth.currentUser();
    if (!u) return;
    this.form.firstName = u.firstName || '';
    this.form.lastName = u.lastName || '';
    this.form.email = u.email || '';
    this.form.city = u.city || '';
    this.resumeChoice.set(u.resumeUrl ? 'profile' : 'upload');
  }

  private loadSimilar(job: JobOffer) {
    this.jobService.getAll({ category: job.category }).subscribe({
      next: (jobs) => this.similarJobs.set(jobs.filter((j) => j.id !== job.id).slice(0, 3)),
      error: () => {},
    });
  }

  // ── Brouillon local ──

  private draftKey(jobId: number) {
    return `${DRAFT_PREFIX}${this.auth.currentUser()?.id ?? 'anon'}.${jobId}`;
  }

  private restoreDraft(jobId: number) {
    const raw = localStorage.getItem(this.draftKey(jobId));
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as ApplyDraft;
      this.form = { ...this.form, ...draft.form };
      if (Array.isArray(draft.answers) && draft.answers.length === this.questions().length) {
        this.answers.set(draft.answers);
      }
      this.stepIndex.set(Math.min(draft.step ?? 0, this.steps().length - 1));
      this.draftRestored.set(true);
    } catch {
      localStorage.removeItem(this.draftKey(jobId));
    }
  }

  private saveDraft() {
    const job = this.job();
    if (!job) return;
    const draft: ApplyDraft = {
      form: this.form,
      answers: this.answers(),
      step: this.stepIndex(),
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(this.draftKey(job.id), JSON.stringify(draft));
  }

  private clearDraft() {
    const job = this.job();
    if (job) localStorage.removeItem(this.draftKey(job.id));
  }

  discardDraft() {
    this.clearDraft();
    this.form = {
      firstName: '', lastName: '', email: '', phone: '', city: '',
      coverLetter: '', availableFrom: '', salaryExpectation: '',
    };
    this.answers.set(this.questions().map(() => ''));
    this.prefillFromProfile();
    this.stepIndex.set(0);
    this.draftRestored.set(false);
    this.errors.set([]);
  }

  // ── Navigation ──

  goToStep(index: number) {
    // On ne saute pas en avant sans avoir valide toutes les etapes traversees.
    if (index > this.stepIndex()) {
      for (let i = this.stepIndex(); i < index; i++) {
        if (!this.validateStep(this.steps()[i].key)) {
          // On se pose sur l'etape fautive : sinon le message reproche une
          // reponse manquante que l'ecran affiche ne montre meme pas.
          this.stepIndex.set(i);
          return;
        }
      }
    }
    this.stepIndex.set(Math.max(0, Math.min(index, this.steps().length - 1)));
    this.errors.set([]);
    this.saveDraft();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  next() {
    if (!this.validateStep(this.currentStep())) return;
    if (!this.isLastStep()) this.goToStep(this.stepIndex() + 1);
  }

  prev() {
    this.errors.set([]);
    if (this.stepIndex() > 0) this.goToStep(this.stepIndex() - 1);
  }

  /** Sauter une etape facultative (lettre, informations complementaires). */
  skip() {
    this.errors.set([]);
    if (!this.isLastStep()) this.goToStep(this.stepIndex() + 1);
  }

  // ── Validation ──

  private validateStep(step: StepKey): boolean {
    const problems: string[] = [];
    switch (step) {
      case 'contact':
        if (!this.form.firstName.trim()) problems.push('Le prénom est obligatoire.');
        if (!this.form.lastName.trim()) problems.push('Le nom est obligatoire.');
        if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.form.email.trim()))
          problems.push('Saisissez une adresse e-mail valide.');
        break;
      case 'resume':
        if (this.resumeRequired && !this.selectedResumeUrl)
          problems.push('Ce recruteur exige un CV : choisissez-en un ou téléversez un fichier PDF.');
        break;
      case 'questions':
        this.questions().forEach((q, i) => {
          if (q.required && !(this.answers()[i] || '').trim())
            problems.push(`Répondez à la question « ${q.text} ».`);
          if (q.type === 'number' && (this.answers()[i] || '').trim() && isNaN(Number(this.answers()[i])))
            problems.push(`« ${q.text} » attend un nombre.`);
        });
        break;
    }
    this.errors.set(problems);
    return problems.length === 0;
  }

  setAnswer(index: number, value: string) {
    this.answers.update((a) => {
      const copy = [...a];
      copy[index] = value;
      return copy;
    });
  }

  // ── CV ──

  onResumeSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      this.toastr.error('Seuls les fichiers PDF sont acceptés.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toastr.error('Le fichier ne doit pas dépasser 5 Mo.');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.uploadService.uploadResume(file).subscribe({
      next: (res) => {
        this.uploading.set(false);
        this.uploadedResumeUrl.set(res.url);
        this.uploadedFileName.set(file.name);
        this.resumeChoice.set('upload');
        this.errors.set([]);
        // Le televersement remplace aussi le CV du profil cote serveur :
        // on resynchronise la session pour que le profil affiche le bon fichier.
        this.auth.getMe().subscribe({ error: () => {} });
        this.toastr.success('CV ajouté à votre candidature');
      },
      error: (err) => {
        this.uploading.set(false);
        this.toastr.error(err.error?.message || err.error || "Échec de l'envoi du CV");
      },
    });
  }

  resumeLabel(): string {
    switch (this.resumeChoice()) {
      case 'upload':
        return this.uploadedFileName() || 'Nouveau CV';
      case 'none':
        return 'Aucun CV joint';
      default:
        return this.profileResumeUrl ? 'CV de mon profil' : 'Aucun CV joint';
    }
  }

  // ── Envoi ──

  submit() {
    // Le fil d'etapes permet de revenir en arriere : on revalide tout avant
    // l'envoi, sinon une etape esquivee passerait entre les mailles.
    const steps = this.steps();
    for (let i = 0; i < steps.length; i++) {
      if (!this.validateStep(steps[i].key)) {
        this.stepIndex.set(i);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }
    }

    const job = this.job();
    if (!job) return;

    this.submitting.set(true);
    const screeningAnswers = this.questions().length
      ? JSON.stringify(
          this.questions().map((q, i) => ({ question: q.text, answer: (this.answers()[i] || '').trim() }))
        )
      : undefined;

    this.appService
      .create({
        jobOfferId: job.id,
        fullName: `${this.form.firstName.trim()} ${this.form.lastName.trim()}`,
        email: this.form.email.trim(),
        phone: this.form.phone.trim() || undefined,
        city: this.form.city.trim() || undefined,
        coverLetter: this.form.coverLetter.trim() || undefined,
        resumeUrl: this.selectedResumeUrl,
        availableFrom: this.form.availableFrom || undefined,
        salaryExpectation: this.form.salaryExpectation.trim() || undefined,
        screeningAnswers,
        source: 'Candidature complète',
      })
      .subscribe({
        next: () => {
          this.submitting.set(false);
          this.clearDraft();
          this.sent.set(true);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        error: (err) => {
          this.submitting.set(false);
          const message = err.error?.message || err.error || "Échec de l'envoi de la candidature";
          this.errors.set([typeof message === 'string' ? message : "Échec de l'envoi de la candidature"]);
        },
      });
  }

  salaryLabel = salaryLabel;
}
