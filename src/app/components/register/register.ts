import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { PlatformService } from '../../services/platform.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-register',
  imports: [RouterLink, FormsModule],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  platform = inject(PlatformService);

  form = { firstName: '', lastName: '', email: '', password: '', role: 'Candidate', company: '' };
  loading = false;
  showPassword = false;

  setRole(role: string) { this.form.role = role; }

  /**
   * Solidite du mot de passe, de 0 a 4.
   *
   * Le formulaire annoncait « 6 caracteres minimum » et n'en disait rien
   * de plus : on apprenait au moment de valider que le compte etait
   * refuse, ou pire on repartait avec un mot de passe de six lettres. La
   * jauge repond pendant la frappe, ou le retour ne coute rien.
   */
  get pwScore(): number {
    const p = this.form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 6) s++;
    if (p.length >= 10) s++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
    if (/[0-9]/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
    return s;
  }

  get pwLabel(): string {
    return ['Trop court', 'Faible', 'Correct', 'Bon', 'Excellent'][this.pwScore];
  }

  submit() {
    if (!this.platform.allowRegistration) {
      this.toastr.error('Les inscriptions sont actuellement fermees');
      return;
    }
    if (!this.form.firstName || !this.form.lastName || !this.form.email || !this.form.password) {
      this.toastr.warning('Remplissez tous les champs obligatoires'); return;
    }
    if (this.form.password.length < 6) { this.toastr.warning('Mot de passe : 6 caracteres minimum'); return;  }
    this.loading = true;
    this.auth.register(this.form).subscribe({
      next: () => { this.toastr.success('Compte créé avec succes'); this.router.navigate(['/']); },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || 'Erreur lors de l\'inscription'); },
    });
  }
}
