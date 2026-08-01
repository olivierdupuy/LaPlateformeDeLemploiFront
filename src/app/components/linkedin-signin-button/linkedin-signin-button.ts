import { Component } from '@angular/core';
import { environment } from '../../../environments/environment';

/**
 * Connexion LinkedIn.
 *
 * Le bouton n'échange rien lui-même : il envoie vers LinkedIn, qui
 * renvoie sur /login avec un code d'autorisation. C'est la page de
 * connexion qui le remet au serveur, seul détenteur du secret de
 * l'application.
 *
 * Le paramètre « state » est tiré au sort et gardé de côté : au retour,
 * il doit correspondre. Sans lui, un tiers pourrait provoquer une
 * connexion sous son propre compte LinkedIn depuis n'importe quelle page.
 */
@Component({
  selector: 'app-linkedin-signin-button',
  standalone: true,
  template: `
    @if (actif) {
      <button type="button" class="lksi" (click)="entrer()">
        <i class="bi bi-linkedin" aria-hidden="true"></i>
        Continuer avec LinkedIn
      </button>
    }
  `,
  styles: [`
    .lksi {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.55rem;
      width: 100%;
      max-width: 300px;
      margin: 0.7rem auto 0;
      padding: 0.62rem 1rem;
      border: 1px solid var(--line-strong);
      border-radius: var(--r-sm);
      background: var(--canvas);
      font-size: 0.9rem;
      font-weight: 500;
      color: var(--ink);
      cursor: pointer;
      transition: border-color var(--t), background var(--t);
    }
    .lksi:hover { border-color: #0a66c2; background: color-mix(in oklab, #0a66c2 5%, transparent); }
    .lksi i { font-size: 1.05rem; color: #0a66c2; }
  `],
})
export class LinkedinSignInButton {
  /** Sans identifiant d'application, le bouton n'existe pas : il ne mènerait nulle part. */
  actif = !!environment.linkedInClientId;

  static readonly CLE_ETAT = 'lpde_linkedin_state';

  /** L'URL déclarée chez LinkedIn, reconstruite à l'identique de chaque côté. */
  static redirectUri(): string {
    return `${location.origin}/login`;
  }

  entrer() {
    const etat = crypto.randomUUID();
    sessionStorage.setItem(LinkedinSignInButton.CLE_ETAT, etat);

    const p = new URLSearchParams({
      response_type: 'code',
      client_id: environment.linkedInClientId,
      redirect_uri: LinkedinSignInButton.redirectUri(),
      state: etat,
      scope: 'openid profile email',
    });
    location.href = `https://www.linkedin.com/oauth/v2/authorization?${p}`;
  }
}
