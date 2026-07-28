import { Pipe, PipeTransform } from '@angular/core';

/**
 * Nom que les imports posent quand la source ne communique pas l'employeur.
 * Doit rester aligné sur CompanyNames.Undisclosed côté API.
 */
export const EMPLOYEUR_ANONYME = 'Entreprise';

/** Vrai si l'offre ne nomme pas son employeur : ni fiche, ni lien à proposer. */
export function estEmployeurAnonyme(nom: string | null | undefined): boolean {
  return (nom ?? '').trim().toLowerCase() === EMPLOYEUR_ANONYME.toLowerCase();
}

@Pipe({ name: 'employeur' })
export class EmployerNamePipe implements PipeTransform {
  transform(nom: string | null | undefined): string {
    return estEmployeurAnonyme(nom) ? 'Employeur non précisé' : (nom ?? '');
  }
}
