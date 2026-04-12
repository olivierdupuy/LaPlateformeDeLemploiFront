import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  form = { email: '', password: '' };
  loading = false;
  showPassword = false;

  submit() {
    if (!this.form.email || !this.form.password) { this.toastr.warning('Remplissez tous les champs'); return; }
    this.loading = true;
    this.auth.login(this.form).subscribe({
      next: () => { this.toastr.success('Connexion reussie'); this.router.navigate(['/']); },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || 'Erreur de connexion'); },
    });
  }
}
