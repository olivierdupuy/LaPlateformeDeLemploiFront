import { Injectable, computed, signal } from '@angular/core';

/**
 * Les cinq moments de l'authentification.
 *
 * « confirmation » n'attend aucune saisie : le lien du courriel suffit,
 * et la vue ne fait qu'annoncer le résultat.
 */
export type VueAuth = 'connexion' | 'inscription' | 'oubli' | 'reinitialisation' | 'confirmation';

export interface ContexteAuth {
  /**
   * Où conduire une fois l'identité établie.
   *
   * Nul — le cas ordinaire — signifie « on ne bouge pas ». C'est tout
   * l'intérêt de la modale : on se connecte depuis une offre et l'on
   * reste sur l'offre, au lieu d'être renvoyé à l'accueil et de devoir
   * retrouver ce qu'on lisait.
   */
  redirect?: string | null;

  /** Ce que le lien d'un courriel porte : réinitialisation, confirmation. */
  id?: string;
  jeton?: string;

  /** Retour de LinkedIn, à échanger contre une session. */
  code?: string;
  etat?: string;
}

/**
 * L'authentification n'est plus une page mais une couche.
 *
 * Elle était servie par trois routes, donc trois pages pleines : cliquer
 * « Connexion » depuis une offre faisait quitter l'offre, et revenir
 * dessus après coup était à la charge du visiteur. Une modale conserve
 * le contexte — la page reste derrière, et la connexion redevient une
 * parenthèse plutôt qu'un détour.
 *
 * Les adresses subsistent malgré tout. Elles ne sont pas décoratives :
 * un lien de réinitialisation, une confirmation d'adresse et le retour
 * de LinkedIn arrivent d'ailleurs, et doivent répondre. Elles ouvrent
 * la modale par-dessus l'accueil au lieu d'afficher une page.
 */
@Injectable({ providedIn: 'root' })
export class AuthModalService {
  private _vue = signal<VueAuth | null>(null);
  private _contexte = signal<ContexteAuth>({});

  readonly vue = this._vue.asReadonly();
  readonly contexte = this._contexte.asReadonly();
  readonly ouverte = computed(() => this._vue() !== null);

  /**
   * Une destination n'est acceptée que si elle est interne.
   *
   * « //ailleurs.fr » est un chemin pour la logique naïve et une adresse
   * absolue pour le navigateur : sans ce filtre, notre propre écran de
   * connexion servirait de tremplin vers n'importe quel site.
   */
  static chemin(cible: string | null | undefined): string | null {
    if (!cible) return null;
    return cible.startsWith('/') && !cible.startsWith('//') ? cible : null;
  }

  ouvrir(vue: VueAuth, contexte: ContexteAuth = {}) {
    this._contexte.set({ ...contexte, redirect: AuthModalService.chemin(contexte.redirect) });
    this._vue.set(vue);
  }

  /** Passer d'une vue à l'autre sans perdre la destination d'origine. */
  basculer(vue: VueAuth) {
    if (this._vue() === null) return this.ouvrir(vue);
    this._vue.set(vue);
  }

  fermer() {
    this._vue.set(null);
    this._contexte.set({});
  }
}
