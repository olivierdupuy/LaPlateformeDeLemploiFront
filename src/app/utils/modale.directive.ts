import {
  Directive,
  ElementRef,
  OnDestroy,
  OnInit,
  inject,
  output,
} from '@angular/core';

/**
 * Ce qu'une boîte de dialogue doit à qui n'utilise pas la souris.
 *
 * Les modales du site se fermaient d'un clic sur le fond. C'est un
 * confort de souris, et c'était la seule sortie : au clavier, on
 * arrivait dans la modale et on n'en sortait plus — ou plutôt, on n'y
 * arrivait jamais, la tabulation continuant tranquillement à parcourir
 * la page cachée derrière.
 *
 * L'analyse statique signalait ces fonds comme « éléments cliquables
 * non focalisables ». La correction évidente — leur poser un
 * `tabindex` — aurait été une faute : on ne tabule pas vers un
 * arrière-plan, et cela aurait ajouté vingt-deux arrêts de tabulation
 * qui ne mènent nulle part tout en faisant taire l'avertissement. Le
 * manque était ailleurs.
 *
 * Cette directive apporte les trois choses qui manquaient réellement :
 *
 *   **Échap ferme.** C'est ce que tout le monde essaie en premier.
 *
 *   **Le focus entre et reste.** Il se pose sur le premier élément
 *   utile à l'ouverture, et la tabulation boucle à l'intérieur. Sans
 *   cela, un lecteur d'écran lit la page de dessous en croyant lire la
 *   modale.
 *
 *   **Le focus revient d'où il venait.** À la fermeture, il retourne
 *   sur le bouton qui a ouvert la modale. Sans ce retour, on est
 *   renvoyé en haut du document et il faut tout reparcourir.
 *
 * Usage :
 *   <div class="modal-overlay" appModale (fermeture)="fermer()">
 */
@Directive({
  selector: '[appModale]',
  standalone: true,
  host: {
    '(keydown)': 'auClavier($event)',
    '(click)': 'auClicFond($event)',
  },
})
export class Modale implements OnInit, OnDestroy {
  private hote: ElementRef<HTMLElement> = inject(ElementRef);

  /** Émis sur Échap. Le clic sur le fond reste géré par l'appelant. */
  readonly fermeture = output<void>();

  /** Ce qui avait le focus avant l'ouverture, pour le lui rendre. */
  private precedent: HTMLElement | null = null;

  /**
   * Ce vers quoi la tabulation peut aller. `:not([disabled])` compte :
   * un bouton désactivé n'est pas un arrêt, et le piège tournerait
   * dans le vide s'il l'était.
   */
  private static readonly FOCALISABLES = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  ngOnInit(): void {
    this.precedent = document.activeElement as HTMLElement | null;
    this.annoncerLeDialogue();

    // Après le rendu : le contenu de la modale est souvent posé par un
    // « @if » qui n'a pas encore produit ses nœuds à cet instant.
    queueMicrotask(() => {
      const cibles = this.focalisables();

      // Le premier élément utile, et non le bouton de fermeture s'il
      // ouvre la liste : arriver sur « Fermer » donne l'impression que
      // la modale s'annonce en proposant d'en sortir.
      const premier =
        cibles.find((e) => !/fermer|close|annuler/i.test(e.getAttribute('aria-label') ?? '')) ??
        cibles[0];

      premier?.focus();
    });
  }

  ngOnDestroy(): void {
    // Le nœud peut avoir quitté le document (navigation) : lui rendre
    // le focus n'aurait aucun effet, mais ne coûte rien non plus.
    this.precedent?.focus?.();
  }

  /**
   * Ferme au clic sur le fond, et seulement sur le fond.
   *
   * Le motif précédent posait un `(click)` de fermeture sur le voile et
   * un `(click)="$event.stopPropagation()"` sur le contenu pour
   * l'empêcher de remonter. Deux gestionnaires de clic sur des `div`
   * dont l'un ne sert qu'à annuler l'autre — l'analyse d'accessibilité
   * les signalait tous les deux comme des éléments interactifs non
   * focalisables, et elle avait raison sur la forme.
   *
   * Comparer la cible à l'élément courant suffit : un clic à
   * l'intérieur du panneau a pour cible un descendant, pas le voile.
   * Le contenu n'a donc plus rien à annuler.
   */
  auClicFond(evenement: MouseEvent): void {
    if (evenement.target === evenement.currentTarget) this.fermeture.emit();
  }

  auClavier(evenement: KeyboardEvent): void {
    if (evenement.key === 'Escape') {
      evenement.stopPropagation();
      this.fermeture.emit();
      return;
    }

    if (evenement.key !== 'Tab') return;

    const cibles = this.focalisables();
    if (cibles.length === 0) {
      // Rien à focaliser : on retient quand même la tabulation, sinon
      // elle repart dans la page de dessous, que la modale masque.
      evenement.preventDefault();
      return;
    }

    const premier = cibles[0];
    const dernier = cibles[cibles.length - 1];
    const actif = document.activeElement;

    if (evenement.shiftKey && actif === premier) {
      evenement.preventDefault();
      dernier.focus();
    } else if (!evenement.shiftKey && actif === dernier) {
      evenement.preventDefault();
      premier.focus();
    }
  }

  /**
   * Faire savoir qu'il s'agit d'une boîte de dialogue.
   *
   * Le piège de focus retient la tabulation, mais un lecteur d'écran ne
   * navigue pas qu'à la tabulation : en mode exploration, il parcourt
   * le document et lisait tranquillement la page derrière la modale,
   * sans jamais annoncer qu'une fenêtre s'était ouverte. La personne
   * entendait un formulaire de recherche pendant qu'un dialogue
   * attendait sa réponse.
   *
   * Trois attributs suffisent, et un seul est subtil :
   *
   *   `role="dialog"` et `aria-modal="true"` disent ce que c'est, et
   *   que le reste du document est hors-jeu.
   *
   *   `aria-labelledby` pointe sur le titre du panneau. Sans lui, le
   *   dialogue s'annonce « dialogue », sans dire lequel.
   *
   * Posés ici et non dans chaque gabarit : sept modales, sept oublis
   * possibles. Une seule d'entre elles les portait déjà — on ne
   * l'écrase pas.
   */
  private annoncerLeDialogue(): void {
    const voile = this.hote.nativeElement;

    // Le panneau, c'est le premier enfant : le voile n'est qu'un fond.
    const panneau = voile.firstElementChild as HTMLElement | null;
    if (!panneau) return;

    if (!panneau.hasAttribute('role')) panneau.setAttribute('role', 'dialog');
    if (!panneau.hasAttribute('aria-modal')) panneau.setAttribute('aria-modal', 'true');

    if (!panneau.hasAttribute('aria-labelledby') && !panneau.hasAttribute('aria-label')) {
      const titre = panneau.querySelector('h1, h2, h3, h4, legend');
      if (titre) {
        if (!titre.id) titre.id = `modale-titre-${Modale.compteur++}`;
        panneau.setAttribute('aria-labelledby', titre.id);
      }
    }
  }

  /** De quoi fabriquer des identifiants uniques quand deux modales coexistent. */
  private static compteur = 0;

  private focalisables(): HTMLElement[] {
    return Array.from(
      this.hote.nativeElement.querySelectorAll<HTMLElement>(Modale.FOCALISABLES),
    ).filter((e) => e.offsetParent !== null || e.getClientRects().length > 0);
  }
}
