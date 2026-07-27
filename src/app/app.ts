import { Component, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { Navbar } from './components/navbar/navbar';
import { Footer } from './components/footer/footer';
import { SiteBanner } from './components/site-banner/site-banner';
import { CookieConsent } from './components/cookie-consent/cookie-consent';
import { PlatformService } from './services/platform.service';
import { AuthService } from './services/auth.service';
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

  ngOnInit() {
    this.platform.load();
  }
}
