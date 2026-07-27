import { environment } from '../../environments/environment';

/**
 * Adresse d'un fichier téléversé (CV, pièce jointe).
 *
 * La base stocke un chemin relatif — « /uploads/resumes/….pdf » — servi
 * par l'API. En production le site et l'API vivent sur deux hôtes
 * distincts : posé tel quel dans un lien, ce chemin viserait le site et
 * n'aboutirait à rien.
 */
export const API_ORIGINE = environment.apiUrl.replace(/\/api\/?$/, '');

export function fichierUrl(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  // Un chemin deja absolu (stockage externe) se passe de prefixe.
  if (/^https?:\/\//i.test(chemin)) return chemin;
  return API_ORIGINE + (chemin.startsWith('/') ? chemin : '/' + chemin);
}
