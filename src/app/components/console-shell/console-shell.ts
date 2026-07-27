import { Component, computed, inject, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface ConsoleLink {
  path: string;
  label: string;
  icon: string;
  exact?: boolean;
}

const RECRUITER_LINKS: ConsoleLink[] = [
  { path: '/espace-recruteur', label: 'Tableau de bord', icon: 'bi-grid-1x2', exact: true },
  { path: '/admin/mes-offres', label: 'Mes offres', icon: 'bi-collection' },
  { path: '/admin/candidatures', label: 'Candidatures', icon: 'bi-people' },
  { path: '/candidats', label: 'Vivier', icon: 'bi-person-lines-fill' },
  { path: '/entretiens', label: 'Entretiens', icon: 'bi-calendar-event' },
];

const ADMIN_LINKS: ConsoleLink[] = [
  { path: '/admin/dashboard', label: 'Tableau de bord', icon: 'bi-grid-1x2' },
  { path: '/admin/mes-offres', label: 'Offres', icon: 'bi-collection' },
  { path: '/admin/candidatures', label: 'Candidatures', icon: 'bi-people' },
  { path: '/admin/moderation', label: 'Modération', icon: 'bi-check2-square' },
  { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'bi-shield-lock' },
  { path: '/admin/statistiques', label: 'Statistiques', icon: 'bi-bar-chart-line' },
  { path: '/admin/annonces', label: 'Annonces', icon: 'bi-megaphone' },
  { path: '/admin/activite', label: 'Activité', icon: 'bi-clock-history' },
  { path: '/admin/parametres', label: 'Paramètres', icon: 'bi-gear' },
];

/**
 * Coquille des espaces de travail (recruteur et administration).
 *
 * Ces espaces comptent cinq a neuf sections, qui n'etaient atteignables
 * que par le menu de l'avatar : on ne savait ni ou l'on etait, ni ce
 * qui existait a cote. La coquille pose une sous-navigation persistante
 * sous la navbar, puis un en-tete de page identique partout.
 *
 * L'espace affiche depend du role : l'administrateur voit la console
 * d'administration, le recruteur la sienne. Pour un candidat (la page
 * Entretiens est partagee), aucune sous-navigation n'est rendue.
 */
@Component({
  selector: 'app-console-shell',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './console-shell.html',
  styleUrl: './console-shell.scss',
})
export class ConsoleShell {
  private auth = inject(AuthService);

  /** 'auto' suit le role ; forcer 'recruteur' pour une page hors /admin. */
  space = input<'auto' | 'recruteur' | 'admin'>('auto');

  /** Les pages de detail ont deja leur propre en-tete : elles ne
   *  prennent que la sous-navigation. */
  showHead = input(true);

  links = computed<ConsoleLink[]>(() => {
    const wanted = this.space();
    if (wanted === 'admin') return ADMIN_LINKS;
    if (wanted === 'recruteur') return RECRUITER_LINKS;
    if (this.auth.isAdmin()) return ADMIN_LINKS;
    if (this.auth.isRecruiter()) return RECRUITER_LINKS;
    return [];
  });

  spaceLabel = computed(() =>
    this.links() === ADMIN_LINKS ? 'Administration' : 'Espace recruteur',
  );
}
