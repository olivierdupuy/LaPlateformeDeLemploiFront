import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UploadService } from '../../services/upload.service';
import { CvService } from '../../services/cv.service';
import { ToastrService } from 'ngx-toastr';
import { companyColor } from '../../utils/job.utils';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';
import { ConsoleShell } from '../console-shell/console-shell';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, FormsModule, ConsoleShell],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private uploadService = inject(UploadService);
  private cvService = inject(CvService);
  companyColor = companyColor;
  apiBaseUrl = environment.apiUrl.replace(/\/api\/?$/, '');

  profileForm: { firstName: string; lastName: string; company: string; bio: string; title: string; skills: string; experienceYears: number | null; education: string; city: string; linkedInUrl: string; portfolioUrl: string; isSearchable: boolean } = { firstName: '', lastName: '', company: '', bio: '', title: '', skills: '', experienceYears: null, education: '', city: '', linkedInUrl: '', portfolioUrl: '', isSearchable: true };
  pwForm = { currentPassword: '', newPassword: '' };
  savingProfile = false;
  savingPw = false;
  uploadingCv = false;
  importingProfile = false;

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u) {
      this.profileForm = {
        firstName: u.firstName, lastName: u.lastName, company: u.company || '', bio: u.bio || '',
        title: u.title || '', skills: u.skills || '', experienceYears: u.experienceYears || null,
        education: u.education || '', city: u.city || '', linkedInUrl: u.linkedInUrl || '', portfolioUrl: u.portfolioUrl || '',
        isSearchable: u.isSearchable ?? true
      };
    }
  }

  get isCandidate(): boolean { return this.auth.currentUser()?.role === 'Candidate'; }

  private completenessFields() {
    const u = this.auth.currentUser();
    return [
      { key: 'title', label: 'Intitulé de poste', ok: !!u?.title },
      { key: 'bio', label: 'Bio', ok: !!u?.bio },
      { key: 'skills', label: 'Compétences', ok: !!u?.skills },
      { key: 'experienceYears', label: 'Années d\'expérience', ok: u?.experienceYears != null },
      { key: 'education', label: 'Formation', ok: !!u?.education },
      { key: 'city', label: 'Ville', ok: !!u?.city },
      { key: 'resumeUrl', label: 'CV', ok: !!u?.resumeUrl },
    ];
  }
  get completeness(): number {
    const f = this.completenessFields();
    return Math.round((f.filter((x) => x.ok).length / f.length) * 100);
  }
  get missingFields(): string[] {
    return this.completenessFields().filter((x) => !x.ok).map((x) => x.label);
  }

  toggleSearchable() {
    this.profileForm.isSearchable = !this.profileForm.isSearchable;
    this.auth.updateProfile({ isSearchable: this.profileForm.isSearchable }).subscribe({
      next: () => this.toastr.success(this.profileForm.isSearchable ? 'Profil visible par les recruteurs' : 'Profil masqué du vivier'),
      error: () => { this.profileForm.isSearchable = !this.profileForm.isSearchable; this.toastr.error('Erreur'); },
    });
  }

  onProfileCvSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.pdf') && !ext.endsWith('.docx') && !ext.endsWith('.doc')) { this.toastr.warning('Formats acceptés : PDF, DOCX, DOC'); return; }
    if (file.size > 10 * 1024 * 1024) { this.toastr.warning('Le fichier ne doit pas dépasser 10 Mo'); return; }
    (event.target as HTMLInputElement).value = '';
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
        this.toastr.success('Profil pré-rempli depuis votre CV. Vérifiez puis enregistrez.', 'Import IA');
      },
      error: (err) => { this.importingProfile = false; this.toastr.error(err.error?.message || "Échec de l'analyse du CV"); },
    });
  }

  saveProfile() {
    this.savingProfile = true;
    this.auth.updateProfile(this.profileForm).subscribe({
      next: () => { this.savingProfile = false; this.toastr.success('Profil mis a jour'); },
      error: () => { this.savingProfile = false; this.toastr.error('Erreur'); },
    });
  }

  changePassword() {
    if (this.pwForm.newPassword.length < 6) { this.toastr.warning('6 caracteres minimum'); return; }
    this.savingPw = true;
    this.auth.changePassword(this.pwForm).subscribe({
      next: () => { this.savingPw = false; this.pwForm = { currentPassword: '', newPassword: '' }; this.toastr.success('Mot de passe modifié'); },
      error: (err) => { this.savingPw = false; this.toastr.error(err.error?.message || 'Erreur'); },
    });
  }

  onCvFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') { this.toastr.warning('Seuls les fichiers PDF sont acceptes'); return; }
    if (file.size > 5 * 1024 * 1024) { this.toastr.warning('Le fichier ne doit pas depasser 5 Mo'); return; }
    this.uploadingCv = true;
    this.uploadService.uploadResume(file).subscribe({
      next: () => {
        this.auth.getMe().subscribe();
        this.uploadingCv = false;
        this.toastr.success('CV televerse avec succes');
        this.proposeAiParsing(file);
      },
      error: (err) => { this.uploadingCv = false; this.toastr.error(err.error?.message || 'Erreur lors du telechargement'); },
    });
  }

  private async proposeAiParsing(file: File) {
    const res = await Swal.fire({
      title: 'Analyser le CV avec l\'IA ?',
      text: 'Voulez-vous analyser ce PDF pour remplir automatiquement les sections de votre CV en ligne ?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1657c4',
      cancelButtonColor: '#5a6b85',
      confirmButtonText: 'Analyser',
      cancelButtonText: 'Non merci',
    });
    if (res.isConfirmed) {
      Swal.fire({
        title: 'Analyse IA en cours...',
        html: 'Extraction des sections de votre CV.<br>Comptez jusqu\'à une minute selon la longueur du CV.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => Swal.showLoading(),
      });
      this.cvService.parseFile(file).subscribe({
        next: (res) => {
          const sections = res.sections ?? [];
          if (sections.length === 0) { Swal.close(); this.toastr.warning('Aucune section extraite'); return; }
          if (res.truncated) {
            this.toastr.warning("Le CV était trop long : sa fin n'a pas été analysée.", 'Analyse partielle');
          }
          this.cvService.deleteAll().subscribe({
            next: () => {
              this.cvService.createBatch(sections).subscribe({
                next: () => {
                  Swal.close();
                  this.toastr.success(`${sections.length} section(s) importee(s) dans votre CV en ligne`);
                },
                error: () => { Swal.close(); this.toastr.error('Erreur lors de l\'import des sections'); },
              });
            },
            error: () => { Swal.close(); this.toastr.error('Erreur lors de la mise à jour du CV'); },
          });
        },
        error: () => { Swal.close(); this.toastr.error('Erreur lors de l\'analyse IA'); },
      });
    }
  }

  async deleteAccount() {
    const res = await Swal.fire({
      title: 'Supprimer votre compte ?',
      text: 'Cette action est irreversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e42b2f',
      cancelButtonColor: '#5a6b85',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    });
    if (res.isConfirmed) {
      this.auth.deleteAccount().subscribe({
        next: () => { this.toastr.success('Compte supprimé'); this.auth.logout(); },
        error: () => this.toastr.error('Erreur lors de la suppression'),
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
      error: () => this.toastr.error('Erreur lors de l\'export'),
    });
  }
}
