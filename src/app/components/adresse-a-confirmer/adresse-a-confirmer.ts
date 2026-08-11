import { Component, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ToastrService } from 'ngx-toastr';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';

/**
 * Le rappel de confirmer son adresse.
 *
 * Naviguer, chercher, postuler restent ouverts sans confirmation : le
 * site n'a pas à se fermer à qui vient d'arriver. Ce qui exige une
 * adresse vérifiée, c'est ce qui engage — publier une offre, écrire à
 * quelqu'un. Ce bandeau est le seul endroit où l'on peut redemander le
 * lien quand le premier s'est perdu.
 */
@Component({
  selector: 'app-adresse-a-confirmer',
  standalone: true,
  template: `
    @if (aMontrer()) {
      <div class="ac-bandeau" role="status">
        <i class="bi bi-envelope-exclamation" aria-hidden="true"></i>
        <p>
          Confirmez votre adresse pour publier une offre ou écrire à un candidat.
          Le lien est parti à <strong>{{ adresse() }}</strong>.
        </p>
        <button type="button" (click)="renvoyer()" [disabled]="enCours()">
          {{ enCours() ? 'Envoi…' : 'Renvoyer le lien' }}
        </button>
        <button type="button" class="ac-fermer" (click)="masque.set(true)" aria-label="Masquer">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
    }
  `,
  styles: [`
    /* Les couleurs sont celles de la charte, prises aux jetons : ce
       bandeau n'avait jamais ete vu — rendu apres le pied de page — et
       ses trois valeurs en dur dataient de l'identite precedente. Sa
       hauteur et son rythme suivent ceux du bandeau d'annonce, avec
       lequel il peut se retrouver empile. */
    .ac-bandeau {
      display: flex;
      align-items: center;
      gap: .75rem;
      padding: .62rem clamp(1.1rem, 4vw, 2.25rem);
      background: var(--ambre-100);
      border-bottom: 1px solid rgba(0, 28, 81, 0.08);
      color: var(--rouge-700);
      font-size: .83rem;
      line-height: 1.45;
    }
    .ac-bandeau p { margin: 0; flex: 1; }
    .ac-bandeau button {
      border: 1px solid currentColor;
      background: transparent;
      color: inherit;
      border-radius: 6px;
      padding: .3rem .7rem;
      cursor: pointer;
      font: inherit;
      white-space: nowrap;
    }
    .ac-bandeau button:disabled { opacity: .55; cursor: default; }
    .ac-fermer { border-color: transparent !important; padding: .3rem .45rem !important; }
    @media (max-width: 640px) {
      .ac-bandeau { flex-wrap: wrap; }
      .ac-bandeau p { flex-basis: 100%; }
    }
  `],
})
export class AdresseAConfirmer {
  private http = inject(HttpClient);
  private toastr = inject(ToastrService);
  private auth = inject(AuthService);

  readonly masque = signal(false);
  readonly enCours = signal(false);

  readonly adresse = computed(() => this.auth.currentUser()?.email ?? '');

  readonly aMontrer = computed(() => {
    const u = this.auth.currentUser();
    // Un compte sans « emailConfirmed » dans sa réponse est un compte
    // servi par une version antérieure de l'API : on ne l'accuse pas.
    return !!u && u.emailConfirmed === false && !this.masque();
  });

  renvoyer() {
    this.enCours.set(true);
    this.http.post<{ message: string }>(`${environment.apiUrl}/auth/confirmer-email/renvoyer`, {})
      .subscribe({
        next: (r) => { this.toastr.success(r.message); this.enCours.set(false); },
        error: (e) => {
          this.toastr.error(e?.error?.message ?? "Le message n'a pas pu partir.");
          this.enCours.set(false);
        },
      });
  }
}
