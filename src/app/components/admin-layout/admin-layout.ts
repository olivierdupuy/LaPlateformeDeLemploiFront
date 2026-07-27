import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface AdminLink {
  path: string;
  label: string;
  icon: string;
}

/**
 * Panneau d'administration — coquille dédiée.
 *
 * L'administration n'est pas une page du site : c'est un outil. Elle sort
 * donc du gabarit public (navbar de recherche, pied de page marketing,
 * bandeau cookies) pour prendre une barre latérale fixe, comme tout panneau
 * d'admin. La palette reste celle de la marque.
 *
 * Le rôle est exclusif : un administrateur administre. Il n'a ni espace
 * candidat ni espace recruteur — d'où l'absence de « publier une offre » ou
 * de « mes candidatures » dans cette navigation.
 */
@Component({
  selector: 'app-admin-layout',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  auth = inject(AuthService);

  /** Barre latérale repliée sur petit écran. */
  navOpen = signal(false);

  links: AdminLink[] = [
    { path: '/admin/tableau-de-bord', label: 'Tableau de bord', icon: 'bi-grid-1x2' },
    { path: '/admin/statistiques', label: 'Statistiques', icon: 'bi-bar-chart-line' },
    { path: '/admin/moderation', label: 'Modération', icon: 'bi-check2-square' },
    { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'bi-people' },
    { path: '/admin/annonces', label: 'Annonces', icon: 'bi-megaphone' },
    { path: '/admin/activite', label: 'Activité', icon: 'bi-clock-history' },
    { path: '/admin/parametres', label: 'Paramètres', icon: 'bi-gear' },
  ];

  @HostListener('document:keydown.escape')
  onEscape() {
    this.navOpen.set(false);
  }

  toggleNav() {
    this.navOpen.update((v) => !v);
  }

  closeNav() {
    this.navOpen.set(false);
  }

  initials(): string {
    const u = this.auth.currentUser();
    if (!u) return '';
    return `${u.firstName?.charAt(0) ?? ''}${u.lastName?.charAt(0) ?? ''}`;
  }

  logout() {
    this.auth.logout();
  }
}
