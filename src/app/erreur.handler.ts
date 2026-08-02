import { ErrorHandler, Injectable, inject, Injector } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../environments/environment';

/**
 * Ce qui casse chez le visiteur.
 *
 * Une exception JavaScript en production n'allait nulle part : elle
 * s'inscrivait dans une console que personne n'ouvre, sur un appareil
 * qu'on ne possède pas. Un bouton mort pour tous les utilisateurs de
 * Safari pouvait tenir des semaines sans qu'aucune trace n'existe — le
 * serveur, lui, répondait 200 à tout.
 *
 * Ce gestionnaire remonte donc au serveur ce que le navigateur a
 * rencontré. Trois précautions, sans quoi le remède serait pire :
 *
 *   **Ne pas s'auto-alimenter.** Si la remontée échoue, on n'en fait pas
 *   une seconde erreur : la boucle saturerait l'API en quelques
 *   secondes.
 *
 *   **Ne pas répéter.** Une exception dans un rendu se relance à chaque
 *   cycle de détection. Sans mémoire des messages déjà vus, une seule
 *   panne produirait des milliers de lignes identiques.
 *
 *   **Ne pas envoyer les erreurs HTTP.** Elles sont déjà journalisées
 *   côté serveur, où elles sont mieux décrites. Les remonter reviendrait
 *   à tout compter deux fois.
 */
@Injectable()
export class GestionnaireErreurs implements ErrorHandler {
  private injector = inject(Injector);

  /** Messages déjà remontés dans cette session : on ne répète pas. */
  private vues = new Set<string>();

  /**
   * Plafond par session. Au-delà, quelque chose est cassé en boucle et
   * la centième copie n'apprend rien de plus que la première.
   */
  private static readonly PLAFOND = 20;
  private envoyees = 0;

  /** Vrai pendant l'envoi : une erreur née là ne doit pas repartir. */
  private enCoursDEnvoi = false;

  handleError(erreur: unknown): void {
    // La console reste servie : en développement c'est là qu'on regarde,
    // et la pile y est lisible avec les sources d'origine.
    console.error(erreur);

    if (!environment.production) return;
    if (this.enCoursDEnvoi) return;
    if (this.envoyees >= GestionnaireErreurs.PLAFOND) return;

    // Une erreur HTTP est déjà connue du serveur. Une annulation de
    // requête (changement de page en cours de chargement) n'est pas une
    // panne du tout.
    if (erreur instanceof HttpErrorResponse) return;

    const brut = erreur instanceof Error ? erreur : new Error(String(erreur));
    const message = (brut.message || 'Erreur sans message').slice(0, 500);

    // Deux fautes différentes peuvent porter le même message ; la pile
    // les sépare. On n'en garde que la tête, suffisante pour identifier.
    const empreinte = message + '|' + (brut.stack || '').split('\n')[1];
    if (this.vues.has(empreinte)) return;
    this.vues.add(empreinte);
    this.envoyees++;

    this.remonter({
      message,
      pile: (brut.stack || '').slice(0, 4_000),
      chemin: location.pathname + location.search,
      navigateur: navigator.userAgent.slice(0, 300),
    });
  }

  private remonter(charge: Record<string, string>): void {
    this.enCoursDEnvoi = true;
    try {
      // Résolu à la demande : injecter HttpClient dans le constructeur
      // créerait une dépendance circulaire — l'intercepteur qui l'équipe
      // dépend lui-même du gestionnaire d'erreurs.
      const http = this.injector.get(HttpClient);
      http.post(`${environment.apiUrl}/journal/erreur-navigateur`, charge).subscribe({
        // Silencieux des deux côtés : ni confirmation à afficher, ni
        // échec à signaler. Le visiteur n'a pas demandé ce rapport.
        next: () => {},
        error: () => {},
      });
    } catch {
      // L'injecteur n'est pas prêt (erreur au démarrage de
      // l'application) : rien à faire, et surtout rien à relancer.
    } finally {
      this.enCoursDEnvoi = false;
    }
  }
}
