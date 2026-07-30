import { Component, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { GoogleSignInButton } from '../google-signin-button/google-signin-button';

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule, GoogleSignInButton],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private toastr = inject(ToastrService);

  form = { email: '', password: '' };
  loading = false;
  showPassword = false;

  /** Page demandée avant la connexion (ex. un tunnel de candidature interrompu). */
  private get redirectTo(): string {
    const target = this.route.snapshot.queryParamMap.get('redirect');
    // On n'accepte qu'un chemin interne : une adresse absolue ouvrirait
    // une redirection vers n'importe quel site depuis notre page de connexion.
    return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
  }

  submit() {
    if (!this.form.email || !this.form.password) { this.toastr.warning('Remplissez tous les champs'); return; }
    this.loading = true;
    this.auth.login(this.form).subscribe({
      next: () => { this.toastr.success('Connexion réussie'); this.router.navigateByUrl(this.redirectTo); },
      error: (err) => { this.loading = false; this.toastr.error(err.error?.message || 'Erreur de connexion'); },
    });
  }
}
