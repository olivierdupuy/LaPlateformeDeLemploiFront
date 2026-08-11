import { Component, input, signal } from '@angular/core';
import { Modale } from '../../utils/modale.directive';

/**
 * Le texte long d'une page, sans la page longue.
 *
 * Les explications ajoutées aux écrans publics — d'où viennent les
 * offres, comment sont calculés les salaires, ce que devient un CV —
 * font entre trois cents et six cents mots chacune. Posées à plat en fin
 * de page, elles doublaient la hauteur d'écrans qu'on parcourt déjà au
 * kilomètre, et pénalisaient ceux qui n'ont rien à y apprendre.
 *
 * Le compromis retenu : ce qui décide de lire reste dans la page — un
 * surtitre, un titre, deux phrases — et le développement passe en
 * modale. On y entre par un geste, on en sort par Échap.
 *
 * Deux formes, selon l'écran :
 *
 *   `bande` sur les pages publiques. Le titre et le chapeau y sont du
 *   vrai contenu, indexable et lisible sans clic.
 *
 *   `ligne` dans les espaces de travail. Une rangée discrète en bas de
 *   page : l'aide y est disponible sans occuper la place de l'outil.
 *
 * Ce qui est dans la modale n'est pas dans le document tant qu'on ne
 * l'ouvre pas. C'est le prix de la manœuvre, et il est assumé : le
 * chapeau porte ce qu'un moteur doit voir, le reste s'adresse à
 * quelqu'un qui a déjà décidé de lire.
 */
@Component({
  selector: 'app-explication',
  imports: [Modale],
  templateUrl: './explication.html',
  styleUrl: './explication.scss',
})
export class Explication {
  /** Petite ligne au-dessus du titre : « Méthode », « La plateforme »… */
  surtitre = input('');

  readonly titre = input.required<string>();

  /** Les deux phrases qui restent visibles dans la page. */
  chapeau = input('');

  /** Libellé du bouton, quand « Lire l'explication » ne convient pas. */
  libelle = input("Lire l'explication");

  forme = input<'bande' | 'ligne'>('bande');

  ouvert = signal(false);
}
