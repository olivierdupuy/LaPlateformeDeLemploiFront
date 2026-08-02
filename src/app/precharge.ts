import { Injectable } from '@angular/core';
import { PreloadingStrategy, Route } from '@angular/router';
import { Observable, of, timer } from 'rxjs';
import { mergeMap } from 'rxjs/operators';

/**
 * Ce qu'on va chercher d'avance, et ce qu'on laisse dormir.
 *
 * Découper les routes règle le poids du premier écran mais déplace le
 * coût : chaque page demande désormais son morceau au moment du clic.
 * Sur une liaison lente, ce délai se voit.
 *
 * `PreloadAllModules` réglerait cela en téléchargeant tout — y compris
 * les quinze écrans d'administration qu'un visiteur ne verra jamais.
 * On préfère désigner : une route déclare `precharger: true` quand elle
 * fait partie du parcours normal, et elle seule est ramenée.
 *
 * Le délai n'est pas décoratif. Précharger immédiatement mettrait ces
 * requêtes en concurrence avec celles du premier écran — les offres, la
 * police, l'image d'en-tête — et on aurait échangé un affichage lent
 * contre un autre. Deux secondes après l'arrivée, le réseau est libre.
 */
@Injectable({ providedIn: 'root' })
export class PrechargeParcoursPublic implements PreloadingStrategy {
  /** Laisse passer le premier écran avant d'occuper la liaison. */
  private static readonly DELAI_MS = 2_000;

  preload(route: Route, charger: () => Observable<unknown>): Observable<unknown> {
    if (!route.data?.['precharger']) return of(null);

    // Une liaison comptée ou lente : on ne dépense pas le forfait de
    // quelqu'un pour une page qu'il n'a pas demandée. L'API n'existe pas
    // partout, d'où la lecture prudente.
    const connexion = (navigator as { connection?: { saveData?: boolean; effectiveType?: string } })
      .connection;
    if (connexion?.saveData) return of(null);
    if (connexion?.effectiveType && /2g/.test(connexion.effectiveType)) return of(null);

    return timer(PrechargeParcoursPublic.DELAI_MS).pipe(mergeMap(() => charger()));
  }
}
