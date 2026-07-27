import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { SiteBanner } from './components/site-banner/site-banner';
import { CookieConsent } from './components/cookie-consent/cookie-consent';
import { PlatformService } from './services/platform.service';
import { AuthService } from './services/auth.service';
import { SignalRService } from './services/signalr.service';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Navbar, Footer, SiteBanner, CookieConsent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  platform = inject(PlatformService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private signalR = inject(SignalRService);

  get isAdmin(): boolean { return this.auth.isAdmin(); }

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

  ngOnInit() {
    this.platform.load();
    this.scrollToTopOnPageChange();

    // La connexion temps réel appartient à l'application, pas à une barre
    // de navigation : elle était ouverte par la navbar publique, que le
    // panneau d'administration ne rend pas — l'administration se trouvait
    // donc privée de temps réel. Le service ignore les appels répétés.
    const token = this.auth.token;
    if (token) this.signalR.start(token);
  }
}
