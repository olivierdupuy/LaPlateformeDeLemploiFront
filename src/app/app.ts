import { Component, ElementRef, OnInit, effect, inject, viewChild } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { SiteBanner } from './components/site-banner/site-banner';
import { CookieConsent } from './components/cookie-consent/cookie-consent';
import { MesureAudience } from './services/mesure-audience.service';
import { AdresseAConfirmer } from './components/adresse-a-confirmer/adresse-a-confirmer';
import { ImpersonationBanner } from './components/impersonation-banner/impersonation-banner';
import { AuthModal } from './components/auth-modal/auth-modal';
import { PlatformService } from './services/platform.service';
import { AuthService } from './services/auth.service';
import { SignalRService } from './services/signalr.service';
import { BookmarkService } from './services/bookmark.service';
import { SeoService } from './services/seo.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

/**
 * Tout ce qui vit derrière une authentification. Le préfixe suffit :
 * `/admin` couvre l'ensemble du panneau.
 */
const PREFIXES_PRIVES = [
  '/login', '/register', '/mot-de-passe-oublie', '/reinitialiser',
  '/profil', '/suivi', '/favoris', '/mon-cv', '/recherches', '/messages',
  '/entretiens', '/candidatures', '/mon-metier', '/qui-recrute',
  '/tableau-de-bord', '/recruteur', '/admin', '/candidats',
];

const TITRES_PRIVES: Record<string, string> = {
  '/login': 'Connexion',
  '/register': 'Inscription',
  '/profil': 'Mon profil',
  '/suivi': 'Mes candidatures',
  '/favoris': 'Mes favoris',
  '/mon-cv': 'Mon CV',
  '/messages': 'Messages',
};

/**
 * Le plancher des pages publiques. Titre et description sont écrits pour
 * être lus dans une page de résultats, pas pour répéter le nom du site :
 * c'est cette ligne qui décide du clic.
 */
const PAGES_PUBLIQUES: Record<string, { title: string; description: string }> = {
  '/': {
    title: "Offres d'emploi en France",
    description:
      "Des milliers d'offres d'emploi rassemblées au même endroit : CDI, CDD, alternance, stage et télétravail. Postulez et suivez chaque candidature jusqu'à la réponse.",
  },
  '/offres': {
    title: "Offres d'emploi",
    description:
      "Recherchez parmi des milliers d'offres d'emploi par métier, ville, contrat et salaire. Alertes par email et suivi de vos candidatures.",
  },
  '/parcourir': {
    title: 'Parcourir les métiers et les villes',
    description:
      "Explorez les offres d'emploi par métier, secteur, type de contrat et ville. Trouvez qui recrute près de chez vous.",
  },
  '/entreprises': {
    title: 'Les entreprises qui recrutent',
    description:
      'Découvrez les entreprises qui recrutent en France : leurs offres en cours, leurs avis et leurs implantations.',
  },
  '/salaires': {
    title: 'Salaires par métier',
    description:
      'Combien gagne-t-on dans votre métier ? Salaires annuels observés sur les offres réellement publiées, par intitulé de poste.',
  },
  '/guide': {
    title: 'Guide des carrières',
    description:
      "Conseils pratiques pour votre recherche d'emploi : CV, lettre de motivation, entretien, négociation salariale et reconversion.",
  },
  '/evenements': {
    title: "Événements emploi et salons de recrutement",
    description:
      'Salons, forums et job datings : les rendez-vous pour rencontrer des recruteurs en France.',
  },
};

/**
 * Plancher des pages de détail, le temps que l'API réponde. Ordonné du
 * plus précis au plus général : `/salaires/metier` avant `/salaires`.
 */
const TITRES_SECTIONS: [string, string][] = [
  ['/salaires/metier/', 'Salaire du métier'],
  ['/offres/', "Offre d'emploi"],
  ['/entreprises/', 'Entreprise qui recrute'],
  ['/guide/', 'Guide des carrières'],
];

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, SiteBanner, CookieConsent, ImpersonationBanner, AuthModal, AdresseAConfirmer],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  platform = inject(PlatformService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private signalR = inject(SignalRService);
  private bookmarks = inject(BookmarkService);
  private seo = inject(SeoService);
  private mesure = inject(MesureAudience);

  get isAdmin(): boolean { return this.auth.isAdmin(); }

  /**
   * La hauteur qu'occupent les bandeaux du haut, publiée en variable CSS.
   *
   * Elle ne peut pas être écrite en dur : il y a zéro, un, deux ou trois
   * bandeaux selon le compte et le moment, et chacun passe sur deux
   * lignes dès que la fenêtre se resserre. Une valeur fausse laisse soit
   * une bande vide sous l'en-tête, soit du contenu recouvert — les deux
   * défauts que cette pile corrige.
   *
   * La navbar, la barre latérale de l'administration et `<main>` lisent
   * `--pile-h`. Elle vaut `0px` tant que rien n'est affiché, ce qui est
   * le cas de l'immense majorité des visites.
   */
  private readonly pile = viewChild<ElementRef<HTMLElement>>('pile');
  private observateurPile?: ResizeObserver;

  private suivreLaPile = effect(() => {
    const element = this.pile()?.nativeElement;

    this.observateurPile?.disconnect();
    this.observateurPile = undefined;

    if (!element) {
      this.poserHauteurPile(0);
      return;
    }

    this.poserHauteurPile(element.offsetHeight);

    // Absent de l'environnement de test, où la mesure n'a de toute façon
    // pas de sens : la hauteur initiale suffit alors.
    if (typeof ResizeObserver === 'undefined') return;

    this.observateurPile = new ResizeObserver(() =>
      this.poserHauteurPile(element.offsetHeight),
    );
    this.observateurPile.observe(element);
  });

  private poserHauteurPile(hauteur: number): void {
    document.documentElement.style.setProperty('--pile-h', `${Math.round(hauteur)}px`);
  }

  /**
   * Le panneau d'administration a son propre gabarit : ni navbar de
   * recherche, ni pied de page marketing, ni bandeau du site.
   */
  isAdminArea = toSignal(
    this.router.events.pipe(
      filter((e): e is NavigationEnd => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/admin')),
      startWith(this.router.url.startsWith('/admin')),
    ),
    { initialValue: this.router.url.startsWith('/admin') },
  );

  /**
   * Remonte en haut à l'arrivée sur une nouvelle page.
   *
   * Sans cela, un clic depuis le bas d'une longue liste ouvre la page
   * suivante à mi-hauteur, sur un fragment de contenu qui ne veut rien
   * dire — le navigateur conserve la position, pas le contexte.
   *
   * Le saut est volontairement limité aux changements de chemin. Les
   * filtres et la pagination des explorateurs n'écrivent que des
   * paramètres de requête : remonter à chaque frappe dans une recherche
   * rendrait ces pages inutilisables.
   */
  private scrollToTopOnPageChange() {
    let lastPath = this.stripQuery(this.router.url);

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        const path = this.stripQuery(e.urlAfterRedirects);
        if (path === lastPath) return;
        lastPath = path;

        // Une ancre demande explicitement une autre destination que le haut.
        if (e.urlAfterRedirects.includes('#')) return;

        // 'instant' et non 'auto' : la feuille de style pose
        // scroll-behavior: smooth sur html, et 'auto' s'y conforme. La
        // remontee devenait donc une animation, que le rendu de la page
        // suivante interrompait en chemin — on retombait a mi-hauteur.
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      });
  }

  private stripQuery(url: string): string {
    return url.split('?')[0].split('#')[0];
  }

  /**
   * Référencement par défaut, à chaque navigation.
   *
   * Deux problèmes se règlent ici plutôt que dans vingt composants.
   *
   * D'abord l'espace connecté : un profil, une messagerie, un tableau de
   * bord n'ont rien à faire dans un index. Les déclarer un par un
   * laisserait tôt ou tard passer une page — la liste des routes privées
   * est le seul endroit qui les connaît toutes.
   *
   * Ensuite la rémanence : sans valeur par défaut, une page qui ne dit
   * rien d'elle-même garde le titre et la description de la précédente.
   * On revenait d'une offre vers l'accueil en gardant « Développeur Java
   * chez TechCorp » dans l'onglet.
   *
   * Les pages publiques appellent ensuite le service pour préciser leur
   * cas ; ce qui suit n'est qu'un plancher.
   */
  private declarerSeoParDefaut() {
    const appliquer = (url: string) => {
      const chemin = this.stripQuery(url);

      // Les données structurées de la page quittée sont retirées à chaque
      // navigation, et non par la page qui les a posées : seule la fiche
      // d'offre en écrit, et rien ne les enlevait en la quittant. On
      // passait d'une offre aux salaires en gardant une annonce déclarée
      // dans l'en-tête — Google aurait lu une offre d'emploi sur une page
      // de statistiques.
      this.seo.structuredData([]);

      const prive = PREFIXES_PRIVES.some((p) => chemin === p || chemin.startsWith(p + '/'));
      if (prive) {
        this.seo.privee(TITRES_PRIVES[chemin] ?? 'Mon espace');
        return;
      }

      const page = PAGES_PUBLIQUES[chemin];
      if (page) {
        this.seo.set({ ...page, canonicalPath: chemin });
        return;
      }

      // Page publique de détail — une offre, une entreprise, un métier.
      // Elle précisera son cas dès que l'API aura répondu ; en attendant,
      // ce plancher évite de garder le titre de la page précédente, et
      // tient si la requête échoue.
      this.seo.set({
        title: TITRES_SECTIONS.find(([p]) => chemin.startsWith(p))?.[1] ?? '',
        description: PAGES_PUBLIQUES['/'].description,
        canonicalPath: chemin,
      });
    };

    appliquer(this.router.url);
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => appliquer(e.urlAfterRedirects));
  }

  ngOnInit() {
    this.platform.load();
    this.scrollToTopOnPageChange();
    this.declarerSeoParDefaut();

    // La mesure d'audience ne s'arme que si une instance auto-hébergée
    // est déclarée dans l'environnement, et ne compte que si le
    // visiteur a accepté cette finalité-là. Sans l'un ou l'autre, aucun
    // octet ne quitte le navigateur.
    this.mesure.demarrer();

    // La connexion temps réel appartient à l'application, pas à une barre
    // de navigation : elle était ouverte par la navbar publique, que le
    // panneau d'administration ne rend pas — l'administration se trouvait
    // donc privée de temps réel. Le service ignore les appels répétés.
    const token = this.auth.token;
    if (token) {
      this.signalR.start(token);
      // Les favoris viennent du serveur : on les charge des l'ouverture de
      // session, en versant au passage ceux restes dans le stockage local.
      this.bookmarks.synchroniser().subscribe();
    }
  }
}
