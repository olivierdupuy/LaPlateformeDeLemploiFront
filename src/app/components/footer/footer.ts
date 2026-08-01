import { Component, inject, signal } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Router, RouterLink } from '@angular/router';
import { PlatformService } from '../../services/platform.service';
import { NewsletterService } from '../../services/newsletter.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  private lettre = inject(NewsletterService);

  /** Une fois la demande partie, le formulaire cède la place au message. */
  nlEnvoi = signal(false);
  nlMessage = signal<string | null>(null);
  platform = inject(PlatformService);
  year = new Date().getFullYear();

  private router = inject(Router);

  constructor(private toastr: ToastrService) {}

  /**
   * Inscription aux alertes.
   *
   * Ce champ affichait « Merci ! Vous recevrez nos alertes emploi » sans
   * rien envoyer : l'adresse était jetée à la ligne suivante. Une
   * promesse non tenue est pire qu'un champ absent — la personne attend
   * des offres qui ne viendront jamais.
   *
   * Aucun point d'entrée anonyme n'existe pour recueillir une adresse.
   * Le mécanisme d'alerte, lui, existe : il passe par une recherche
   * enregistrée, qui demande un compte. On conduit donc à l'inscription
   * avec l'adresse déjà saisie, plutôt que de simuler un envoi.
   */
  /**
   * L'abonnement à la lettre d'information.
   *
   * Ce formulaire collectait une adresse puis renvoyait vers l'inscription :
   * il ne promettait rien qu'il tenait. Personne n'a jamais été abonné par
   * lui, et les adresses saisies étaient perdues à la redirection.
   *
   * Il abonne maintenant pour de bon — et n'exige pas de créer un compte,
   * ce qui était la vraie raison pour laquelle la promesse ne tenait pas.
   */
  subscribeNewsletter(input: HTMLInputElement) {
    const email = input.value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.toastr.warning('Veuillez entrer une adresse email valide');
      return;
    }
    this.nlEnvoi.set(true);
    this.lettre.abonner({ email, source: 'Footer' }).subscribe({
      next: (r) => {
        this.nlEnvoi.set(false);
        this.nlMessage.set(r.message);
        input.value = '';
      },
      error: (e) => {
        this.nlEnvoi.set(false);
        this.toastr.error(e?.error?.message ?? 'L’abonnement n’a pas pu être enregistré.');
      },
    });
  }
}
