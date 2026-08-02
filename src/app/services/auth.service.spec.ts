import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { SignalRService } from './signalr.service';
import { environment } from '../../environments/environment';

/**
 * L'ouverture du tuyau temps réel.
 *
 * Ce défaut ne se voyait pas : rien ne cassait, rien ne s'affichait en
 * rouge. Le site fonctionnait, simplement muet. Le hub n'était lancé qu'au
 * démarrage de l'application, depuis le jeton trouvé en mémoire locale —
 * autrement dit avant toute connexion. Se connecter n'ouvrait donc rien :
 * pendant toute la session qui suivait, aucun message, aucune
 * notification, aucune alerte de candidature n'arrivait, et le compteur
 * « en ligne » du panneau restait à zéro. Recharger la page corrigeait
 * tout, ce qui rendait le défaut d'autant plus difficile à croire.
 *
 * Les cinq façons d'ouvrir une session — mot de passe, inscription,
 * Google, LinkedIn, second facteur — passent par le même endroit, et
 * c'est cet endroit que ces tests tiennent.
 */
class HubEspion {
  demarrages: string[] = [];
  arrets = 0;
  start(jeton: string) {
    this.demarrages.push(jeton);
  }
  stop() {
    this.arrets++;
  }
}

const COMPTE = {
  id: 'u-1',
  email: 'personne@exemple.fr',
  firstName: 'Camille',
  lastName: 'Dupont',
  role: 'Recruiter',
};

function monter() {
  localStorage.clear();
  TestBed.resetTestingModule();

  const hub = new HubEspion();
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: SignalRService, useValue: hub as unknown as SignalRService },
      {
        provide: ToastrService,
        useValue: { success: () => {}, error: () => {}, info: () => {} } as unknown as ToastrService,
      },
    ],
  });

  return {
    hub,
    auth: TestBed.inject(AuthService),
    http: TestBed.inject(HttpTestingController),
  };
}

describe('AuthService et le temps réel', () => {
  let ctx: ReturnType<typeof monter>;

  beforeEach(() => {
    ctx = monter();
  });

  it('ouvre le tuyau temps réel dès la connexion', () => {
    ctx.auth.login({ email: COMPTE.email, password: 'x' }).subscribe();
    ctx.http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ token: 'jeton-neuf', user: COMPTE });

    expect(ctx.hub.demarrages).toEqual(['jeton-neuf']);
  });

  it('ferme la connexion précédente avant d’en ouvrir une', () => {
    // Le service ignore un « start » quand une connexion existe déjà :
    // sans l'arrêt, on garderait le tuyau de la session d'avant, ouvert
    // sous le jeton d'avant.
    ctx.auth.login({ email: COMPTE.email, password: 'x' }).subscribe();
    ctx.http.expectOne(`${environment.apiUrl}/auth/login`).flush({ token: 'j', user: COMPTE });

    expect(ctx.hub.arrets).toBe(1);
  });

  it('n’ouvre rien tant que le second facteur n’a pas répondu', () => {
    // Une connexion qui réclame un code n'est pas une connexion. Ouvrir
    // le tuyau à ce moment-là reviendrait à annoncer présente une
    // personne qui n'a pas fini de prouver qui elle est.
    ctx.auth.login({ email: COMPTE.email, password: 'x' }).subscribe();
    ctx.http
      .expectOne(`${environment.apiUrl}/auth/login`)
      .flush({ requiresTwoFactor: true, challengeToken: 'defi' });

    expect(ctx.hub.demarrages).toEqual([]);
    expect(localStorage.getItem('lpde_token')).toBeNull();
  });

  it('ouvre le tuyau quand le code du second facteur est accepté', () => {
    ctx.auth.verifier2fa('defi', '123456').subscribe();
    ctx.http
      .expectOne(`${environment.apiUrl}/auth/2fa/verifier`)
      .flush({ token: 'jeton-apres-code', user: COMPTE });

    expect(ctx.hub.demarrages).toEqual(['jeton-apres-code']);
  });

  it('ouvre le tuyau après une inscription', () => {
    // Une inscription ouvre une session comme une connexion : la
    // personne qui vient de créer son compte doit recevoir la réponse à
    // sa première candidature sans recharger.
    ctx.auth
      .register({
        email: COMPTE.email,
        password: 'x',
        firstName: COMPTE.firstName,
        lastName: COMPTE.lastName,
        role: COMPTE.role,
      })
      .subscribe();
    ctx.http
      .expectOne(`${environment.apiUrl}/auth/register`)
      .flush({ token: 'jeton-inscription', user: COMPTE });

    expect(ctx.hub.demarrages).toEqual(['jeton-inscription']);
  });

  it('referme le tuyau à la déconnexion', () => {
    ctx.auth.logout();
    expect(ctx.hub.arrets).toBe(1);
    expect(ctx.hub.demarrages).toEqual([]);
  });
});
