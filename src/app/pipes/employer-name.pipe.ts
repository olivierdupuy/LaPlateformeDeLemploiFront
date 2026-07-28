import { Pipe, PipeTransform } from '@angular/core';

/**
 * Libellés d'employeur qui ne désignent pas une organisation identifiable.
 * Doit rester aligné sur CompanyNames côté API.
 */

/** Ne nomment personne : l'offre est anonyme, on remplace le libellé. */
const NON_NOMMES = ['entreprise', 'confidentiel', 'recruteur', 'employeur'];

/**
 * Nomment une catégorie d'organisme, pas un organisme. On garde le libellé —
 * savoir que l'employeur est une mairie renseigne le candidat — mais aucune
 * fiche ne peut lui correspondre : « MAIRIE » couvre des centaines de communes.
 */
const INSTITUTIONNELS = ['mairie', 'commune', 'ccas', 'ehpad'];

const cle = (nom: string | null | undefined) => (nom ?? '').trim().toLowerCase();

/** Aucun employeur nommé : afficher « Employeur non précisé ». */
export function estEmployeurAnonyme(nom: string | null | undefined): boolean {
  return NON_NOMMES.includes(cle(nom));
}

/** Libellé générique : ne pas proposer de fiche entreprise. */
export function estEmployeurGenerique(nom: string | null | undefined): boolean {
  const k = cle(nom);
  return NON_NOMMES.includes(k) || INSTITUTIONNELS.includes(k);
}

@Pipe({ name: 'employeur' })
export class EmployerNamePipe implements PipeTransform {
  transform(nom: string | null | undefined): string {
    return estEmployeurAnonyme(nom) ? 'Employeur non précisé' : (nom ?? '');
  }
}
