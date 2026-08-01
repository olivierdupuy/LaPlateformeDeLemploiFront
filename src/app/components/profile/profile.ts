import { Component, OnInit, HostListener, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UploadService } from '../../services/upload.service';
import { CvService } from '../../services/cv.service';
import { ToastrService } from 'ngx-toastr';
import { companyColor } from '../../utils/job.utils';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';
import { ConsoleShell } from '../console-shell/console-shell';

/**
 * Mon profil.
 *
 * La page empilait cinq sections sur un seul défilement, et répétait
 * trois fois la même identité : l'en-tête, une carte de côté, puis le
 * formulaire qui édite ces mêmes champs. La carte de côté avait tout
 * l'air d'un aperçu — sauf qu'elle lisait l'état enregistré, pas la
 * saisie en cours : elle affichait l'ancien intitulé pendant qu'on
 * tapait le nouveau, et ne se corrigeait qu'après enregistrement.
 *
 * Trois partis pris :
 *
 * 1. La carte devient un vrai aperçu, branché sur le formulaire. Elle
 *    montre ce que le recruteur verra, pendant qu'on l'écrit. La
 *    répétition cesse d'être une redite et devient la raison d'être de
 *    la colonne.
 * 2. Les sections deviennent des pages, atteignables par un rail. On ne
 *    traverse plus l'état civil pour remplacer un CV.
 * 3. Rien ne se perd. Le formulaire connaît son état d'origine ; une
 *    barre d'enregistrement n'apparaît que s'il en diffère, et quitter
 *    la page avec des modifications demande confirmation. Avant, douze
 *    champs saisis disparaissaient sans un mot.
 */

type SectionKey = 'identite' | 'cv' | 'visibilite' | 'securite' | 'donnees';

interface Section {
  key: SectionKey;
  label: string;
  icon: string;
  /** Réservé aux candidats : un recruteur n'a ni CV ni vivier. */
  candidateOnly?: boolean;
}

const SECTIONS: Section[] = [
  { key: 'identite', label: 'Identité', icon: 'bi-person-vcard' },
  { key: 'cv', label: 'CV', icon: 'bi-file-earmark-person', candidateOnly: true },
  { key: 'visibilite', label: 'Visibilité', icon: 'bi-eye', candidateOnly: true },
  { key: 'securite', label: 'Sécurité', icon: 'bi-shield-lock' },
  { key: 'donnees', label: 'Mes données', icon: 'bi-database' },
];

interface ProfileForm {
  firstName: string;
  lastName: string;
  company: string;
  bio: string;
  title: string;
  skills: string;
  experienceYears: number | null;
  education: string;
  city: string;
  linkedInUrl: string;
  portfolioUrl: string;
  isSearchable: boolean;
}

const FORM_VIDE = (): ProfileForm => ({
  firstName: '', lastName: '', company: '', bio: '', title: '', skills: '',
  experienceYears: null, education: '', city: '', linkedInUrl: '', portfolioUrl: '',
  isSearchable: true,
});

/** Longueur au-delà de laquelle une bio cesse d'être lue en entier. */
const BIO_CONSEILLEE = 400;

@Component({
  selector: 'app-profile',
  imports: [RouterLink, FormsModule, ConsoleShell],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  auth = inject(AuthService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private uploadService = inject(UploadService);
  private cvService = inject(CvService);

  companyColor = companyColor;
  apiBaseUrl = environment.apiUrl.replace(/\/api\/?$/, '');
  readonly bioMax = BIO_CONSEILLEE;

  profileForm: ProfileForm = FORM_VIDE();
  /** L'état servi par le serveur : la référence contre laquelle on compare. */
  private origine: ProfileForm = FORM_VIDE();

  /**
   * Signal et non propriété simple : sans zone.js, l'écriture faite au
   * retour de la requête ne repeint rien par elle-même. La barre
   * d'enregistrement ne se débloquait que grâce au toast qui suivait.
   */
  savingProfile = signal(false);
  uploadingCv = false;
  importingProfile = false;

  activeSection = signal<SectionKey>('identite');
  /** La suppression de compte ne s'offre pas d'elle-meme : on la demande. */
  dangerOpen = signal(false);
  /** Un fichier survole la zone de depot. */
  dragging = signal(false);

  ngOnInit() {
    this.hydrate();

    const s = this.route.snapshot.queryParamMap.get('section') as SectionKey | null;
    if (s && this.sections.some((x) => x.key === s)) this.activeSection.set(s);
  }

  private hydrate() {
    const u = this.auth.currentUser();
    if (!u) return;
    const etat: ProfileForm = {
      firstName: u.firstName ?? '', lastName: u.lastName ?? '', company: u.company || '',
      bio: u.bio || '', title: u.title || '', skills: u.skills || '',
      experienceYears: u.experienceYears ?? null, education: u.education || '',
      city: u.city || '', linkedInUrl: u.linkedInUrl || '', portfolioUrl: u.portfolioUrl || '',
      isSearchable: u.isSearchable ?? true,
    };
    this.profileForm = { ...etat };
    this.origine = { ...etat };
  }

  get isCandidate(): boolean {
    return this.auth.currentUser()?.role === 'Candidate';
  }

  get sections(): Section[] {
    return SECTIONS.filter((s) => !s.candidateOnly || this.isCandidate);
  }

  setSection(key: SectionKey) {
    this.activeSection.set(key);
    // La section vit dans l'URL : la page se partage et se recharge ouverte
    // au bon endroit, et le retour arriere du navigateur y revient.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { section: key },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  sectionLabel(key: SectionKey) {
    return SECTIONS.find((s) => s.key === key)?.label ?? '';
  }

  // ══ Modifications en attente ══

  /**
   * Un getter, pas un `computed` : `profileForm` est un objet ordinaire,
   * pas un signal — un `computed` ne serait jamais recalculé et la barre
   * d'enregistrement ne paraîtrait jamais.
   */
  get isDirty(): boolean {
    return (Object.keys(this.origine) as (keyof ProfileForm)[]).some(
      (k) => (this.profileForm[k] ?? '') !== (this.origine[k] ?? ''),
    );
  }

  /** Nombre de champs modifiés : la barre dit ce qu'elle va enregistrer. */
  get dirtyCount(): number {
    return (Object.keys(this.origine) as (keyof ProfileForm)[]).filter(
      (k) => (this.profileForm[k] ?? '') !== (this.origine[k] ?? ''),
    ).length;
  }

  revert() {
    this.profileForm = { ...this.origine };
    this.skillDraft = '';
    this.toastr.info('Modifications annulées');
  }

  /**
   * Fermer l'onglet en pleine saisie effaçait tout sans un mot. Le
   * navigateur ne laisse pas personnaliser le message, mais il laisse
   * poser la question.
   */
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(e: BeforeUnloadEvent) {
    if (this.isDirty) {
      e.preventDefault();
      e.returnValue = '';
    }
  }

  // ══ Compétences ══
  // Le champ restait une ligne de texte separee par des virgules :
  // corriger la sixieme competence d'une suite de huit demandait de viser
  // au caractere pres, et une virgule oubliee en fusionnait deux sans
  // que rien ne le signale. Le modele envoye au serveur ne change pas —
  // c'est toujours une chaine — seule la saisie devient une liste.

  /** Brouillon du champ de saisie, avant validation. */
  skillDraft = '';

  /** Les competences telles qu'on les manipule : une liste. */
  skillList(): string[] {
    return this.profileForm.skills.split(',').map((s) => s.trim()).filter(Boolean);
  }

  /** Entree, virgule ou perte du focus valident la competence en cours. */
  addSkill(event?: Event) {
    event?.preventDefault();
    const value = this.skillDraft.trim().replace(/,$/, '').trim();
    this.skillDraft = '';
    if (!value) return;
    const list = this.skillList();
    // Une competence deja presente ne se dedouble pas : le doublon ne dit
    // rien de plus au recruteur et allonge la liste.
    if (list.some((s) => s.toLowerCase() === value.toLowerCase())) return;
    this.profileForm.skills = [...list, value].join(',');
  }

  removeSkill(skill: string) {
    this.profileForm.skills = this.skillList().filter((s) => s !== skill).join(',');
  }

  // ══ Complétude ══

  /**
   * Les manques, lus sur la SAISIE en cours et non sur l'état enregistré :
   * la jauge doit avancer pendant qu'on remplit, sinon elle ne récompense
   * rien. Seul le CV échappe à la règle — il ne vit pas dans le
   * formulaire, il vit sur le serveur.
   *
   * Chaque manque porte la section qui le corrige : la puce est un
   * raccourci, pas une remontrance.
   */
  private champsCompletude() {
    const f = this.profileForm;
    const u = this.auth.currentUser();
    return [
      { key: 'title', label: 'Intitulé de poste', ok: !!f.title.trim(), section: 'identite' as SectionKey },
      { key: 'bio', label: 'Présentation', ok: !!f.bio.trim(), section: 'identite' as SectionKey },
      { key: 'skills', label: 'Compétences', ok: this.skillList().length > 0, section: 'identite' as SectionKey },
      { key: 'experienceYears', label: "Années d'expérience", ok: f.experienceYears != null, section: 'identite' as SectionKey },
      { key: 'education', label: 'Formation', ok: !!f.education.trim(), section: 'identite' as SectionKey },
      { key: 'city', label: 'Ville', ok: !!f.city.trim(), section: 'identite' as SectionKey },
      { key: 'resumeUrl', label: 'CV', ok: !!u?.resumeUrl, section: 'cv' as SectionKey },
    ];
  }

  get completeness(): number {
    const f = this.champsCompletude();
    return Math.round((f.filter((x) => x.ok).length / f.length) * 100);
  }

  get missing() {
    return this.champsCompletude().filter((x) => !x.ok);
  }

  /** Combien de manques restent dans une section : la pastille du rail. */
  missingIn(key: SectionKey): number {
    return this.missing.filter((m) => m.section === key).length;
  }

  /** La puce d'un manque ouvre sa section et pose le curseur sur le champ. */
  goToMissing(m: { key: string; section: SectionKey }) {
    this.setSection(m.section);
    setTimeout(() => {
      const el = document.getElementById('pf-' + m.key) as HTMLElement | null;
      el?.focus();
      el?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 60);
  }

  // ══ Aperçu ══

  get previewInitials(): string {
    const a = this.profileForm.firstName.trim().charAt(0);
    const b = this.profileForm.lastName.trim().charAt(0);
    return (a + b).toUpperCase() || '?';
  }

  get previewName(): string {
    const n = `${this.profileForm.firstName} ${this.profileForm.lastName}`.trim();
    return n || 'Votre nom';
  }

  /** Teinte de la pastille : elle suit le prénom saisi, comme partout ailleurs. */
  get previewColor() {
    return companyColor(this.profileForm.firstName || '?');
  }

  // ══ Enregistrement ══

  saveProfile() {
    if (!this.isDirty) return;
    this.savingProfile.set(true);
    this.auth.updateProfile(this.profileForm).subscribe({
      next: () => {
        this.savingProfile.set(false);
        // La nouvelle reference est ce qu'on vient d'envoyer : sans ca la
        // barre resterait affichee alors qu'il n'y a plus rien a enregistrer.
        this.origine = { ...this.profileForm };
        this.toastr.success('Profil enregistré');
      },
      error: () => {
        this.savingProfile.set(false);
        this.toastr.error("Le profil n'a pas pu être enregistré.");
      },
    });
  }

  toggleSearchable() {
    const cible = !this.profileForm.isSearchable;
    this.profileForm.isSearchable = cible;
    // Ce reglage s'applique seul, sans passer par la barre : c'est un
    // interrupteur, et un interrupteur qui attend un bouton ment sur son
    // etat. On aligne donc aussi la reference.
    this.origine.isSearchable = cible;
    this.auth.updateProfile({ isSearchable: cible }).subscribe({
      next: () => this.toastr.success(cible ? 'Profil visible par les recruteurs' : 'Profil masqué du vivier'),
      error: () => {
        this.profileForm.isSearchable = !cible;
        this.origine.isSearchable = !cible;
        this.toastr.error('Le réglage de visibilité n’a pas pu être modifié.');
      },
    });
  }

  // ══ CV ══

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(true);
  }
  onDragLeave() {
    this.dragging.set(false);
  }
  onDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) this.handleCv(file);
  }

  onCvFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) this.handleCv(file);
  }

  private handleCv(file: File) {
    if (file.type !== 'application/pdf') {
      this.toastr.warning('Seuls les fichiers PDF sont acceptés');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toastr.warning('Le fichier ne doit pas dépasser 5 Mo');
      return;
    }
    this.uploadingCv = true;
    this.uploadService.uploadResume(file).subscribe({
      next: () => {
        this.auth.getMe().subscribe();
        this.uploadingCv = false;
        this.toastr.success('CV téléversé');
        this.proposeAiParsing(file);
      },
      error: (err) => {
        this.uploadingCv = false;
        this.toastr.error(err.error?.message || 'Le CV n’a pas pu être téléversé.');
      },
    });
  }

  onProfileCvSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx') && !ext.endsWith('.doc')) {
      this.toastr.warning('Formats acceptés : PDF, DOCX, DOC');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.toastr.warning('Le fichier ne doit pas dépasser 10 Mo');
      return;
    }
    this.importingProfile = true;
    this.cvService.parseProfile(file).subscribe({
      next: (d) => {
        this.importingProfile = false;
        if (d.title) this.profileForm.title = d.title;
        if (d.skills) this.profileForm.skills = d.skills;
        if (d.experienceYears != null) this.profileForm.experienceYears = d.experienceYears;
        if (d.education) this.profileForm.education = d.education;
        if (d.city) this.profileForm.city = d.city;
        if (d.bio) this.profileForm.bio = d.bio;
        // Rien n'est envoye : la barre d'enregistrement paraitra d'elle-meme
        // puisque le formulaire s'ecarte desormais de sa reference.
        this.toastr.success('Profil pré-rempli. Vérifiez, puis enregistrez.', 'Import IA');
      },
      error: (err) => {
        this.importingProfile = false;
        this.toastr.error(err.error?.message || "L'analyse du CV a échoué.");
      },
    });
  }

  private async proposeAiParsing(file: File) {
    const res = await Swal.fire({
      title: "Analyser le CV avec l'IA ?",
      text: 'Voulez-vous analyser ce PDF pour remplir automatiquement les sections de votre CV en ligne ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Analyser',
      cancelButtonText: 'Non merci',
    });
    if (!res.isConfirmed) return;

    Swal.fire({
      title: 'Analyse IA en cours…',
      html: "Extraction des sections de votre CV.<br>Comptez jusqu'à une minute selon la longueur du CV.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => Swal.showLoading(),
    });
    this.cvService.parseFile(file).subscribe({
      next: (res) => {
        const sections = res.sections ?? [];
        if (sections.length === 0) {
          Swal.close();
          this.toastr.warning('Aucune section extraite');
          return;
        }
        if (res.truncated) {
          this.toastr.warning("Le CV était trop long : sa fin n'a pas été analysée.", 'Analyse partielle');
        }
        this.cvService.deleteAll().subscribe({
          next: () => {
            this.cvService.createBatch(sections).subscribe({
              next: () => {
                Swal.close();
                this.toastr.success(`${sections.length} section(s) importée(s) dans votre CV en ligne`);
              },
              error: () => { Swal.close(); this.toastr.error("Erreur lors de l'import des sections"); },
            });
          },
          error: () => { Swal.close(); this.toastr.error('Erreur lors de la mise à jour du CV'); },
        });
      },
      error: () => { Swal.close(); this.toastr.error("Erreur lors de l'analyse IA"); },
    });
  }

  // ══ Données du compte ══

  async deleteAccount() {
    // Dire ce qui part, et ce qui reste. « Irréversible » ne renseigne
    // sur rien : ce qu'on veut savoir, c'est ce qu'on perd.
    const res = await Swal.fire({
      title: 'Effacer votre compte ?',
      html: `
        <p style="margin:0 0 10px;text-align:left">Partent définitivement&nbsp;: votre profil,
        votre CV téléversé, vos candidatures, vos recherches enregistrées et vos alertes.</p>
        <p style="margin:0 0 14px;text-align:left">Restent en ligne sans votre nom&nbsp;: les avis
        d’entreprise et les salaires que vous avez partagés.</p>
        <p style="margin:0;text-align:left"><strong>Nous ne pourrons pas revenir en arrière.</strong></p>`,
      icon: 'warning',
      input: 'password',
      inputLabel: 'Votre mot de passe, pour confirmer',
      inputAttributes: { autocomplete: 'current-password' },
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Effacer mon compte',
      cancelButtonText: 'Annuler',
      inputValidator: (v) => (v ? null : 'Saisissez votre mot de passe.'),
    });

    if (res.isConfirmed) {
      this.auth.deleteAccount(res.value).subscribe({
        next: () => { this.toastr.success('Compte effacé. Un message de confirmation vous a été envoyé.'); this.auth.logout(); },
        error: (e) => this.toastr.error(e?.error?.message ?? 'Le compte n’a pas pu être effacé.'),
      });
    }
  }

  exportMyData() {
    this.auth.exportData().subscribe({
      next: (data) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mes-donnees-laplateforme.json';
        a.click();
        URL.revokeObjectURL(url);
        this.toastr.success('Données exportées');
      },
      error: () => this.toastr.error("L'export a échoué."),
    });
  }
}
