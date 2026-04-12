import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { UploadService } from '../../services/upload.service';
import { ToastrService } from 'ngx-toastr';
import { companyColor } from '../../utils/job.utils';
import { environment } from '../../../environments/environment';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-profile',
  imports: [RouterLink, FormsModule],
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
})
export class Profile implements OnInit {
  auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  private uploadService = inject(UploadService);
  companyColor = companyColor;
  apiBaseUrl = environment.apiUrl.replace('/api', '');

  profileForm: { firstName: string; lastName: string; company: string; bio: string; title: string; skills: string; experienceYears: number | null; education: string; city: string; linkedInUrl: string; portfolioUrl: string } = { firstName: '', lastName: '', company: '', bio: '', title: '', skills: '', experienceYears: null, education: '', city: '', linkedInUrl: '', portfolioUrl: '' };
  pwForm = { currentPassword: '', newPassword: '' };
  savingProfile = false;
  savingPw = false;
  uploadingCv = false;

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u) {
      this.profileForm = {
        firstName: u.firstName, lastName: u.lastName, company: u.company || '', bio: u.bio || '',
        title: u.title || '', skills: u.skills || '', experienceYears: u.experienceYears || null,
        education: u.education || '', city: u.city || '', linkedInUrl: u.linkedInUrl || '', portfolioUrl: u.portfolioUrl || ''
      };
    }
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
      next: () => { this.savingPw = false; this.pwForm = { currentPassword: '', newPassword: '' }; this.toastr.success('Mot de passe modifie'); },
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
      next: () => { this.auth.getMe().subscribe(); this.uploadingCv = false; this.toastr.success('CV televerse avec succes'); },
      error: (err) => { this.uploadingCv = false; this.toastr.error(err.error?.message || 'Erreur lors du telechargement'); },
    });
  }

  async deleteAccount() {
    const res = await Swal.fire({
      title: 'Supprimer votre compte ?',
      text: 'Cette action est irreversible.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    });
    if (res.isConfirmed) {
      this.auth.logout();
      this.toastr.info('Compte deconnecte');
    }
  }
}
