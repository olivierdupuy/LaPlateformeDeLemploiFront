import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface ConsoleLink {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

interface ConsoleSpace {
  label: string;
  links: ConsoleLink[];
}

const CANDIDATE: ConsoleSpace = {
  label: 'Espace candidat',
  links: [
    { path: '/mon-espace', label: 'Tableau de bord', icon: 'bi-grid-1x2', exact: true },
    // Favoris et entretiens sont des onglets de « Mes candidatures ».
    { path: '/suivi', label: 'Mes candidatures', icon: 'bi-clipboard-check' },
    { path: '/recherches-sauvegardees', label: 'Recherches', icon: 'bi-bookmark-star' },
    { path: '/mon-cv', label: 'Mon CV', icon: 'bi-file-earmark-person' },
  ],
};

const RECRUITER: ConsoleSpace = {
  label: 'Espace recruteur',
  links: [
    { path: '/espace-recruteur', label: 'Tableau de bord', icon: 'bi-grid-1x2', exact: true },
    { path: '/recruteur/offres', label: 'Mes offres', icon: 'bi-collection' },
    { path: '/recruteur/candidatures', label: 'Candidatures', icon: 'bi-people' },
    { path: '/candidats', label: 'Vivier', icon: 'bi-person-lines-fill' },
    { path: '/entretiens', label: 'Entretiens', icon: 'bi-calendar-event' },
    { path: '/messagerie', label: 'Messagerie', icon: 'bi-chat-dots' },
  ],
};

// Le panneau d'administration a sa propre barre laterale : la coquille
// n'y sert qu'a poser l'en-tete de page.
const ADMIN: ConsoleSpace = { label: 'Administration', links: [] };

const EMPTY: ConsoleSpace = { label: '', links: [] };

/**
 * Coquille des espaces de travail (candidat, recruteur, administration).
 *
 * Chaque espace compte cinq a neuf sections, qui n'etaient atteignables que
 * par le menu de l'avatar : on ne savait ni ou l'on etait, ni ce qui existait
 * a cote. La coquille pose une sous-navigation persistante sous la navbar,
 * puis un en-tete de page identique partout.
 *
 * L'espace affiche suit le role. Les pages partagees (Entretiens, Messagerie,
 * Profil) n'ont donc rien a declarer : elles montrent la console du visiteur.
 * Un visiteur non connecte ne voit aucune sous-navigation.
 */
@Component({
  selector: 'app-console-shell',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './console-shell.html',
  styleUrl: './console-shell.scss',
})
export class ConsoleShell {
  private auth = inject(AuthService);

  /** 'auto' suit le role ; forcer une valeur pour une page hors /admin. */
  space = input<'auto' | 'candidat' | 'recruteur' | 'admin'>('auto');

  /** Les pages de detail ont deja leur propre en-tete : elles ne prennent
   *  que la sous-navigation. */
  showHead = input(true);

  private current = computed<ConsoleSpace>(() => {
    switch (this.space()) {
      case 'admin': return ADMIN;
      case 'recruteur': return RECRUITER;
      case 'candidat': return CANDIDATE;
      default:
        if (this.auth.isAdmin()) return ADMIN;
        if (this.auth.isRecruiter()) return RECRUITER;
        return this.auth.isLoggedIn() ? CANDIDATE : EMPTY;
    }
  });

  links = computed(() => this.current().links);
  spaceLabel = computed(() => this.current().label);
}
