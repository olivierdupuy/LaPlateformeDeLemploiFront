import {
  Component,
  ElementRef,
  HostListener,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { catchError, filter, map, of, startWith } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { AdminStatusbar } from '../admin-statusbar/admin-statusbar';

interface AdminLink {
  path: string;
  label: string;
  icon: string;
  /** Mots que la palette de commandes accepte en plus du libelle. */
  alias?: string[];
  /** Nom du compteur a poser sur le lien, s'il en porte un. */
  compteur?: 'moderation';
}

interface AdminGroup {
  label: string;
  links: AdminLink[];
}

/**
 * Panneau d'administration — coquille dediee.
 *
 * L'administration n'est pas une page du site : c'est un outil. Elle sort
 * donc du gabarit public (navbar de recherche, pied de page marketing,
 * bandeau cookies) pour prendre une barre laterale fixe. La palette reste
 * celle de la marque.
 *
 * Le role est exclusif : un administrateur administre. Il n'a ni espace
 * candidat ni espace recruteur — d'ou l'absence de « publier une offre »
 * ou de « mes candidatures » dans cette navigation.
 *
 * ── Ce qui a change ──
 * Les dix sections formaient une liste plate, dans laquelle il fallait
 * relire chaque libelle pour retrouver la bonne. Elles sont desormais
 * groupees par metier — piloter, gerer les contenus, gerer les personnes,
 * regler le systeme — et la file de moderation porte son compte : c'est
 * la seule section ou quelque chose attend une decision, et on ne devrait
 * pas avoir a l'ouvrir pour le decouvrir.
 *
 * S'y ajoute une palette de commandes (Ctrl+K), parce qu'un outil ou l'on
 * passe ses journees se navigue au clavier.
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
  private admin = inject(AdminService);

  /** Barre laterale repliee sur petit ecran. */
  navOpen = signal(false);

  /** Ce que la barre de recherche de la topbar contient. */
  query = signal('');

  groupes: AdminGroup[] = [
    {
      label: 'Pilotage',
      links: [
        { path: '/admin/tableau-de-bord', label: 'Tableau de bord', icon: 'bi-grid-1x2', alias: ['accueil', 'kpi'] },
        { path: '/admin/statistiques', label: 'Statistiques', icon: 'bi-bar-chart-line', alias: ['graphiques', 'chiffres', 'carte'] },
      ],
    },
    {
      label: 'Contenus',
      links: [
        { path: '/admin/offres', label: 'Offres', icon: 'bi-briefcase', alias: ['emplois', 'annonces d\'emploi'] },
        { path: '/admin/moderation', label: 'Modération', icon: 'bi-check2-square', alias: ['valider', 'approuver', 'rejeter'], compteur: 'moderation' },
        { path: '/admin/annonces', label: 'Annonces', icon: 'bi-megaphone', alias: ['bandeau', 'message'] },
        { path: '/admin/newsletter', label: 'Newsletter', icon: 'bi-envelope-paper', alias: ['lettre', 'campagne', 'abonnes', 'brevo'] },
      ],
    },
    {
      label: 'Personnes',
      links: [
        { path: '/admin/utilisateurs', label: 'Utilisateurs', icon: 'bi-people', alias: ['comptes', 'candidats', 'recruteurs'] },
        { path: '/admin/candidatures', label: 'Candidatures', icon: 'bi-file-earmark-text', alias: ['postulations'] },
        { path: '/admin/entretiens', label: 'Entretiens', icon: 'bi-calendar-event', alias: ['rendez-vous'] },
      ],
    },
    {
      label: 'Système',
      links: [
        { path: '/admin/activite', label: 'Activité', icon: 'bi-clock-history', alias: ['journal', 'logs', 'historique'] },
        { path: '/admin/parametres', label: 'Paramètres', icon: 'bi-gear', alias: ['reglages', 'configuration'] },
        // Le compte de l'administrateur lui-meme : double authentification,
        // appareils connectes, mot de passe. Il n'y accedait que par le
        // menu du site public, qu'il ne voit pas depuis la console.
        { path: '/securite', label: 'Ma sécurité', icon: 'bi-shield-lock', alias: ['2fa', 'mot de passe', 'appareils', 'sessions'] },
      ],
    },
  ];

  /** La liste a plat, pour le fil d'Ariane et la palette. */
  private tousLiens = computed(() => this.groupes.flatMap((g) => g.links));

  /**
   * Combien d'offres attendent une decision.
   *
   * Une file d'attente qu'il faut ouvrir pour savoir si elle est vide
   * n'est pas une file d'attente. L'echec est silencieux : un compteur
   * absent vaut mieux qu'un panneau qui ne s'affiche pas.
   */
  aModerer = toSignal(
    this.admin.getModerationQueue('Pending').pipe(
      map((offres) => offres?.length ?? 0),
      catchError(() => of(0)),
    ),
    { initialValue: 0 },
  );

  /**
   * Le fil d'Ariane se deduit de l'URL courante plutot que d'etre pose par
   * chaque page : une section ajoutee a la navigation apparait ici sans
   * qu'on ait a y penser.
   */
  section = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects),
      startWith(this.router.url),
      map((url) => this.tousLiens().find((l) => url.startsWith(l.path))?.label ?? 'Administration'),
    ),
    { initialValue: 'Administration' },
  );

  /** Le groupe auquel appartient la section courante, pour le fil d'Ariane. */
  groupeCourant = computed(() => {
    const s = this.section();
    return this.groupes.find((g) => g.links.some((l) => l.label === s))?.label ?? '';
  });

  /** La ou mene la recherche globale, selon la section consultee. */
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

  // ═══════════════════════════════════════════
  //  Palette de commandes
  // ═══════════════════════════════════════════

  paletteOuverte = signal(false);
  paletteQuery = signal('');
  paletteIndex = signal(0);

  private paletteInput = viewChild<ElementRef<HTMLInputElement>>('paletteInput');

  constructor() {
    // Le champ n'existe qu'une fois la palette ouverte : on lui donne le
    // focus quand il entre dans le DOM, pas avant.
    effect(() => {
      const el = this.paletteInput()?.nativeElement;
      if (el) queueMicrotask(() => el.focus());
    });
  }

  /**
   * Filtre sans accent ni casse, sur le libelle et ses alias : chercher
   * « moderation » doit trouver « Modération », et « logs » doit trouver
   * « Activité ».
   */
  private static pliage(s: string): string {
    return s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  resultats = computed(() => {
    const q = AdminLayout.pliage(this.paletteQuery().trim());
    const liens = this.tousLiens();
    if (!q) return liens;
    return liens.filter((l) =>
      [l.label, ...(l.alias ?? [])].some((t) => AdminLayout.pliage(t).includes(q)),
    );
  });

  ouvrirPalette() {
    this.paletteQuery.set('');
    this.paletteIndex.set(0);
    this.paletteOuverte.set(true);
  }

  fermerPalette() {
    this.paletteOuverte.set(false);
  }

  majPaletteQuery(v: string) {
    this.paletteQuery.set(v);
    this.paletteIndex.set(0);
  }

  /** Deplace la selection en bouclant : on ne se bloque pas au bout de la liste. */
  deplacer(pas: number) {
    const n = this.resultats().length;
    if (!n) return;
    this.paletteIndex.update((i) => (i + pas + n) % n);
  }

  activer(lien?: AdminLink) {
    const cible = lien ?? this.resultats()[this.paletteIndex()];
    if (!cible) return;
    this.fermerPalette();
    this.router.navigate([cible.path]);
  }

  compte(lien: AdminLink): number {
    return lien.compteur === 'moderation' ? this.aModerer() : 0;
  }

  @HostListener('document:keydown', ['$event'])
  onKeydown(e: KeyboardEvent) {
    // Ctrl+K, ou Cmd+K sur Mac. On coupe le raccourci du navigateur :
    // sur Chrome, Ctrl+K vise la barre d'adresse.
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.paletteOuverte() ? this.fermerPalette() : this.ouvrirPalette();
      return;
    }

    if (e.key === 'Escape') {
      if (this.paletteOuverte()) this.fermerPalette();
      else this.navOpen.set(false);
      return;
    }

    if (!this.paletteOuverte()) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.deplacer(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.deplacer(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      this.activer();
    }
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
