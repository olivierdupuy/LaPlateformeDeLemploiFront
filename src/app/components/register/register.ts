import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
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

  form = { firstName: '', lastName: '', email: '', password: '', role: 'Candidate', company: '' };
  loading = false;
  showPassword = false;

  setRole(role: string) { this.form.role = role; }

  submit() {
    if (!this.form.firstName || !this.form.lastName || !this.form.email || !this.form.password) {
      this.toastr.warning('Remplissez tous les champs obligatoires'); return;
    }
    if (this.form.password.length < 6) { this.toastr.warning('Mot de passe : 6 caracteres minimum'); return; }
    this.loading = true;
    this.auth.register(this.form).subscribe({
      next: () => { this.toastr.success('Compte cree avec succes'); this.router.navigate(['/']); },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || 'Erreur lors de l\'inscription'); },
    });
  }
}
