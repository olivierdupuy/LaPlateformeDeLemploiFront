import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../environments/environment';
import { Consentement } from './consentement.service';

/**
 * Savoir quelles pages servent.
 *
 * On ne le savait pas. Pas « imparfaitement » : pas du tout. Aucune
 * mesure n'existait, et les décisions de contenu — quelles pages
 * d'atterrissage créer, quels articles du guide étoffer, quelle étape
 * du dépôt d'offre perd les recruteurs — se prenaient à l'intuition.
 *
 * ── Pourquoi pas Google Analytics ──
 *
 * Parce qu'il transfère les données hors de l'Union et construit un
 * profil publicitaire, ce que la CNIL a sanctionné à plusieurs reprises.
 * Un site d'emploi voit passer des recherches qui disent beaucoup :
 * quelqu'un qui cherche un poste depuis son travail actuel n'a pas
 * envie que cela se retrouve dans un profil publicitaire.
 *
 * Matomo et Plausible, auto-hébergés, répondent au même besoin sans
 * cette contrepartie. Le service ci-dessous parle aux deux : leurs
 * points d'entrée diffèrent, la mesure est la même.
 *
 * ── Le parti retenu ──
 *
 * Le même que pour le paiement, Brevo, OVH et le modèle de langage :
 * **inerte tant que rien n'est configuré, et qui le dit**. Sans
 * `mesureUrl` dans l'environnement, rien ne part et rien ne casse. Il
 * n'y a donc pas de code mort à réveiller le jour où l'instance existe :
 * il y a une adresse à renseigner.
 *
 * Le refus est respecté sans discussion : pas de « mesure anonyme
 * malgré tout », pas de comptage « légitime » sous couvert d'intérêt
 * légitime. Refusé veut dire rien.
 */

/** Ce que l'environnement peut déclarer. Absent partout par défaut. */
interface ConfigurationMesure {
  /** L'instance auto-hébergée, sans barre oblique finale. */
  mesureUrl?: string;
  /** L'identifiant de site chez Matomo. Absent pour Plausible. */
  mesureSiteId?: string;
  /** Le domaine déclaré chez Plausible. Absent pour Matomo. */
  mesureDomaine?: string;
}

@Injectable({ providedIn: 'root' })
export class MesureAudience {
  private router = inject(Router);
  private consentement = inject(Consentement);

  private readonly config = environment as unknown as ConfigurationMesure;
  private demarre = false;

  /** Y a-t-il une instance à qui parler ? */
  get estConfigure(): boolean {
    return !!this.config.mesureUrl;
  }

  /** L'état, en une phrase, pour l'écran d'exploitation. */
  get etat(): string {
    if (!this.estConfigure) {
      return 'Aucune instance de mesure déclarée : rien n’est compté, '
        + 'et aucune requête ne part du navigateur.';
    }
    return this.consentement.mesureAutorisee()
      ? `Pages comptées par ${this.config.mesureUrl}.`
      : 'Instance déclarée, mais la mesure est refusée par le visiteur : rien ne part.';
  }

  /**
   * Commence à compter les changements de page.
   *
   * Appelé une seule fois au démarrage. Ne fait rien sans instance
   * déclarée, et rien tant que la finalité « mesure » n'est pas
   * acceptée — le test est refait à chaque page, pour qu'un retrait de
   * consentement en cours de visite prenne effet immédiatement plutôt
   * qu'à la visite suivante.
   */
  demarrer(): void {
    if (this.demarre || !this.estConfigure) return;
    this.demarre = true;

    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => this.pageVue(e.urlAfterRedirects));
  }

  /**
   * Compte une page.
   *
   * L'adresse est nettoyée de ses paramètres de requête avant l'envoi.
   * Ce n'est pas une précaution de forme : les filtres de recherche y
   * passent, et « /offres?q=depression+reconversion » en dit plus sur
   * quelqu'un que tout le reste de sa visite réunie.
   */
  pageVue(url: string): void {
    if (!this.estConfigure || !this.consentement.mesureAutorisee()) return;

    const chemin = url.split('?')[0].split('#')[0];
    const base = this.config.mesureUrl!.replace(/\/+$/, '');

    // Matomo se reconnaît à son identifiant de site, Plausible à son
    // domaine. Les deux acceptent un appel sans bibliothèque : c'est
    // 200 octets contre les 20 ko d'un script tiers, et cela évite
    // d'exécuter du code que nous n'avons pas écrit.
    if (this.config.mesureSiteId) {
      const params = new URLSearchParams({
        idsite: this.config.mesureSiteId,
        rec: '1',
        url: `${location.origin}${chemin}`,
        action_name: document.title,
        rand: String(Math.floor(Math.random() * 1e9)),
      });
      this.envoyer(`${base}/matomo.php?${params}`);
      return;
    }

    if (this.config.mesureDomaine) {
      this.envoyer(`${base}/api/event`, {
        name: 'pageview',
        domain: this.config.mesureDomaine,
        url: `${location.origin}${chemin}`,
      });
    }
  }

  /**
   * Envoie, et n'attend rien.
   *
   * `keepalive` pour que le comptage survive à la navigation qui l'a
   * déclenché, et une promesse dont l'échec est avalé : une instance
   * de mesure injoignable ne doit jamais produire d'erreur visible
   * dans la console d'un visiteur. Compter est utile ; ce n'est jamais
   * assez important pour se faire remarquer.
   */
  private envoyer(url: string, corps?: unknown): void {
    try {
      void fetch(url, {
        method: corps ? 'POST' : 'GET',
        keepalive: true,
        mode: 'no-cors',
        headers: corps ? { 'Content-Type': 'application/json' } : undefined,
        body: corps ? JSON.stringify(corps) : undefined,
      }).catch(() => { /* mesure perdue, visite intacte */ });
    } catch { /* idem */ }
  }
}
