import { Component, inject, signal } from '@angular/core';
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
  /**
   * Signal et non propriété simple : l'application tourne sans zone.js,
   * et une écriture faite depuis un rappel HTTP n'y déclenche aucun
   * rendu. Cet indicateur ne se remettait à zéro à l'écran que parce
   * qu'un toast l'accompagnait et provoquait la détection au passage —
   * le bouton dépendait donc d'un effet de bord pour se débloquer.
   */
  loading = signal(false);
  showPassword = false;

  /** Page demandée avant la connexion (ex. un tunnel de candidature interrompu). */
  private get redirectTo(): string {
    const target = this.route.snapshot.queryParamMap.get('redirect');
    // On n'accepte qu'un chemin interne : une adresse absolue ouvrirait
    // une redirection vers n'importe quel site depuis notre page de connexion.
    return target && target.startsWith('/') && !target.startsWith('//') ? target : '/';
  }

  /**
   * Ce que la connexion va reprendre.
   *
   * On arrive ici depuis un tunnel de candidature interrompu, un favori,
   * une messagerie — et la page n'en disait rien : « Connexion » tout court
   * laisse croire qu'on a perdu ce qu'on faisait. Le rappel nomme la
   * destination, et la connexion redevient une etape plutot qu'un detour.
   */
  get resumeLabel(): string | null {
    const t = this.redirectTo;
    if (t === '/') return null;
    if (t.includes('/postuler')) return 'Envoyer votre candidature';
    if (t.startsWith('/offres')) return "Revenir a l'offre";
    if (t.startsWith('/favoris')) return 'Vos offres enregistrees';
    if (t.startsWith('/suivi')) return 'Le suivi de vos candidatures';
    if (t.startsWith('/messagerie')) return 'Votre messagerie';
    if (t.startsWith('/mon-cv')) return 'Votre CV';
    if (t.startsWith('/entretiens')) return 'Vos entretiens';
    return 'La page que vous consultiez';
  }

  submit() {
    if (!this.form.email || !this.form.password) { this.toastr.warning('Remplissez tous les champs'); return; }
    this.loading.set(true);
    this.auth.login(this.form).subscribe({
      next: () => { this.toastr.success('Connexion réussie'); this.router.navigateByUrl(this.redirectTo); },
      error: (err) => { this.loading.set(false); this.toastr.error(err.error?.message || 'Erreur de connexion'); },
    });
  }
}
