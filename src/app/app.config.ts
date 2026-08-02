import {
  ApplicationConfig,
  ErrorHandler,
  LOCALE_ID,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { authInterceptor } from './auth.interceptor';
import { PrechargeParcoursPublic } from './precharge';
import { GestionnaireErreurs } from './erreur.handler';

// Sans cela, les dates et les nombres sortent au format anglais
// (« 02 Apr 2026 », « 1,234 ») sur toute l'application.
registerLocaleData(localeFr, 'fr');

// Les reglages communs des graphiques — grille, encres, infobulles,
// animations — se posent desormais au chargement de `viz/chart-presets`,
// et non ici. Les appeler depuis cette configuration tirait Chart.js
// dans le paquet initial de tout le monde, y compris de qui vient lire
// une offre et ne verra jamais un graphique.

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      // Les écrans sont désormais chargés à la demande. Sans préchargement,
      // le découpage se paierait en attente à chaque clic ; la stratégie
      // ne ramène que les routes du parcours normal, et seulement une
      // fois le premier écran affiché. Voir `precharge.ts`.
      withPreloading(PrechargeParcoursPublic),
      // Un retour arrière retrouve la position de lecture, et une
      // navigation vers une ancre y descend. Par défaut le routeur ne
      // fait ni l'un ni l'autre : on revenait d'une offre en haut d'une
      // liste de cinquante résultats.
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    // Ce qui casse chez le visiteur remonte au serveur au lieu de
    // disparaître dans une console que personne n'ouvre.
    { provide: ErrorHandler, useClass: GestionnaireErreurs },
    provideToastr({
      timeOut: 4000,
      positionClass: 'toast-bottom-right',
      preventDuplicates: true,
      progressBar: true,
      progressAnimation: 'decreasing',
      closeButton: true,
      newestOnTop: true,
      easeTime: 300,
      tapToDismiss: true,
    }),
  ],
};
