import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { provideToastr } from 'ngx-toastr';
import { routes } from './app.routes';
import { authInterceptor } from './auth.interceptor';
import { applyChartDefaults } from './viz/chart-presets';

// Sans cela, les dates et les nombres sortent au format anglais
// (« 02 Apr 2026 », « 1,234 ») sur toute l'application.
registerLocaleData(localeFr, 'fr');

// Grille, encres, infobulles, animations : poses une fois pour tous les
// graphiques. Un graphique ajoute plus tard herite du meme reglage au lieu
// de repartir du fond noir et de la legende a droite de Chart.js.
applyChartDefaults();

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'fr' },
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
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
