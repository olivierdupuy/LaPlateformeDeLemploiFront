import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminStatusbar } from '../admin-statusbar/admin-statusbar';

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
  imports: [RouterLink, RouterLinkActive, RouterOutlet, FormsModule, AdminStatusbar],
  templateUrl: './admin-layout.html',
  styleUrl: './admin-layout.scss',
})
export class AdminLayout {
  auth = inject(AuthService);
  private router = inject(Router);

  /** Barre latérale repliée sur petit écran. */
  navOpen = signal(false);

  /** Ce que la barre de recherche de la topbar contient. */
  query = signal('');

  links: AdminLink[] = [
    { path: '/admin/tableau-de-bord', label: 'Tableau de bord', icon: 'bi-grid-1x2' },
    { path: '/admin/statistiques', label: 'Statistiques', icon: 'bi-bar-chart-line' },
    { path: '/admin/offres', label: 'Offres', icon: 'bi-briefcase' },
    { path: '/admin/candidatures', label: 'Candidatures', icon: 'bi-file-earmark-text' },
    { path: '/admin/entretiens', label: 'Entretiens', icon: 'bi-calendar-event' },
    { path: '/admin/moderation', label: 'Modération', icon: 'bi-check2-square' },
    { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'bi-people' },
    { path: '/admin/annonces', label: 'Annonces', icon: 'bi-megaphone' },
    { path: '/admin/activite', label: 'Activité', icon: 'bi-clock-history' },
    { path: '/admin/parametres', label: 'Paramètres', icon: 'bi-gear' },
  ];

  /**
   * Le fil d'Ariane se déduit de l'URL courante plutôt que d'être posé par
   * chaque page : une section ajoutée à la navigation apparaît ici sans
   * qu'on ait à y penser.
   */
  section = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
      map((url) => this.links.find((l) => url.startsWith(l.path))?.label ?? 'Administration'),
    ),
    { initialValue: 'Administration' },
  );

  /** Là où mène la recherche globale, selon la section consultée. */
  private searchScope = computed(() => {
    const label = this.section();
    if (label === 'Candidatures') return { route: '/admin/candidatures', hint: 'les candidatures' };
    if (label === 'Entretiens') return { route: '/admin/entretiens', hint: 'les entretiens' };
    if (label === 'Utilisateurs') return { route: '/admin/utilisateurs', hint: 'les utilisateurs' };
    return { route: '/admin/offres', hint: 'les offres' };
  });

  searchHint = computed(() => `Rechercher dans ${this.searchScope().hint}…`);

  submitSearch() {
    const q = this.query().trim();
    if (!q) return;
    this.router.navigate([this.searchScope().route], { queryParams: { q } });
  }

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
