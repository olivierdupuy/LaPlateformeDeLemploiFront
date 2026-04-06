import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { AccountService, AccountSecurity } from '../../services/account.service';
import { SeoService } from '../../services/seo.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-account-settings',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './account-settings.html',
  styleUrl: './account-settings.css'
})
export class AccountSettings implements OnInit {
  activeTab: 'password' | 'email' | 'security' | 'danger' = 'security';

  // Security info
  security: AccountSecurity | null = null;
  loadingSecurity = true;

  // Change password
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  savingPassword = false;
  showCurrentPassword = false;
  showNewPassword = false;
  showConfirmPassword = false;

  // Change email
  newEmail = '';
  emailPassword = '';
  savingEmail = false;

  // Delete account
  deletePassword = '';
  deleteConfirm = '';
  deleting = false;

  constructor(
    public auth: AuthService,
    private accountService: AccountService,
    private toastr: ToastrService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Mon compte', 'Parametres de securite et gestion de votre compte.');
    this.loadSecurity();
  }

  loadSecurity(): void {
    this.loadingSecurity = true;
    this.accountService.getSecurityInfo().subscribe({
      next: info => { this.security = info; this.loadingSecurity = false; this.cdr.detectChanges(); },
      error: () => { this.loadingSecurity = false; this.cdr.detectChanges(); }
    });
  }

  // === Password ===

  get passwordValid(): boolean {
    return this.currentPassword.length > 0
      && this.newPassword.length >= 6
      && this.newPassword === this.confirmPassword;
  }

  get passwordStrength(): { level: number; label: string; color: string } {
    const p = this.newPassword;
    if (!p) return { level: 0, label: '', color: '' };
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;

    if (score <= 1) return { level: 1, label: 'Faible', color: 'var(--rose-500)' };
    if (score <= 2) return { level: 2, label: 'Moyen', color: 'var(--copper-500)' };
    if (score <= 3) return { level: 3, label: 'Bon', color: 'var(--night-500)' };
    return { level: 4, label: 'Excellent', color: 'var(--forest-500)' };
  }

  changePassword(): void {
    if (!this.passwordValid) return;
    this.savingPassword = true;
    this.accountService.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.toastr.success('Mot de passe modifie avec succes');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.savingPassword = false;
        this.loadSecurity();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur lors du changement de mot de passe');
        this.savingPassword = false;
      }
    });
  }

  // === Email ===

  get emailValid(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.newEmail)
      && this.emailPassword.length > 0
      && this.newEmail !== this.security?.email;
  }

  changeEmail(): void {
    if (!this.emailValid) return;
    this.savingEmail = true;
    this.accountService.changeEmail(this.newEmail, this.emailPassword).subscribe({
      next: (res) => {
        this.toastr.success('Email modifie avec succes');
        // Mettre a jour le localStorage
        const user = this.auth.currentUser;
        if (user) {
          user.email = res.email;
          localStorage.setItem('auth_user', JSON.stringify(user));
        }
        this.newEmail = '';
        this.emailPassword = '';
        this.savingEmail = false;
        this.loadSecurity();
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur lors du changement d\'email');
        this.savingEmail = false;
      }
    });
  }

  // === Delete ===

  async deleteAccount(): Promise<void> {
    if (this.deletePassword.length === 0 || this.deleteConfirm !== 'SUPPRIMER') return;

    const result = await Swal.fire({
      title: 'Supprimer votre compte ?',
      html: `<p style="color:var(--sand-500);font-size:.9rem;">Cette action est <strong>irreversible</strong>. Toutes vos donnees seront definitivement supprimees.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e11d48',
      cancelButtonColor: '#78716c',
      confirmButtonText: 'Oui, supprimer mon compte',
      cancelButtonText: 'Annuler'
    });

    if (!result.isConfirmed) return;

    this.deleting = true;
    this.accountService.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.auth.logout();
        this.router.navigate(['/']);
        this.toastr.success('Votre compte a ete supprime');
      },
      error: (err) => {
        this.toastr.error(err.error?.message || 'Erreur lors de la suppression');
        this.deleting = false;
      }
    });
  }

  formatDate(dateStr: string | null | undefined): string {
    if (!dateStr) return 'Jamais';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }

  daysSince(dateStr: string | null | undefined): number | null {
    if (!dateStr) return null;
    const diff = Date.now() - new Date(dateStr).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  }
}
