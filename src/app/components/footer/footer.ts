import { Component, inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { Router, RouterLink } from '@angular/router';
import { PlatformService } from '../../services/platform.service';
import { I18nService } from '../../services/i18n.service';

@Component({
  selector: 'app-footer',
  imports: [RouterLink],
  templateUrl: './footer.html',
  styleUrl: './footer.scss',
})
export class Footer {
  platform = inject(PlatformService);
  i18n = inject(I18nService);
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
  subscribeNewsletter(input: HTMLInputElement) {
    const email = input.value.trim();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      this.toastr.warning('Veuillez entrer une adresse email valide');
      return;
    }
    input.value = '';
    this.toastr.info('Créez votre compte pour recevoir vos alertes.', 'Plus qu’une étape');
    this.router.navigate(['/register'], { queryParams: { email, alertes: 1 } });
  }
}
