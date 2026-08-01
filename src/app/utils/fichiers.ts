import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * L'accès aux fichiers déposés par les membres.
 *
 * Ces fichiers étaient servis en clair depuis « wwwroot » : n'importe
 * qui connaissant l'adresse téléchargeait un CV, sans jeton ni session,
 * et le nom du fichier se devinait à partir de l'identifiant du membre.
 * Ils passent désormais par une route authentifiée.
 *
 * Conséquence ici : un lien « href » ne convient plus, il ne porte
 * aucun en-tête. On récupère donc le fichier avec le jeton, puis on
 * l'ouvre depuis la mémoire du navigateur.
 */
export const API_ORIGINE = environment.apiUrl.replace(/\/api\/?$/, '');

/** Le nom du fichier porté par un chemin enregistré. */
export function nomFichier(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  const nom = chemin.split(/[/\\]/).pop();
  return nom && nom.toLowerCase().endsWith('.pdf') ? nom : null;
}

@Injectable({ providedIn: 'root' })
export class FichiersService {
  private http = inject(HttpClient);

  /** Vrai pendant la récupération, pour que le bouton puisse le montrer. */
  readonly enCours = signal(false);
  readonly erreur = signal<string | null>(null);

  /**
   * Ouvre un CV dans un nouvel onglet.
   *
   * L'onglet s'ouvre AVANT d'attendre la réponse : ouvert après, les
   * navigateurs le prendraient pour une fenêtre surgissante et le
   * bloqueraient, le geste de l'utilisateur étant déjà oublié.
   */
  async ouvrirCv(chemin: string | null | undefined): Promise<void> {
    const nom = nomFichier(chemin);
    if (!nom) return;

    const onglet = window.open('', '_blank');
    this.enCours.set(true);
    this.erreur.set(null);

    try {
      const blob = await firstValueFrom(
        this.http.get(`${environment.apiUrl}/fichiers/cv/${encodeURIComponent(nom)}`,
                      { responseType: 'blob' }),
      );
      const adresse = URL.createObjectURL(blob);

      if (onglet) onglet.location.href = adresse;
      else window.location.href = adresse;

      // On ne révoque pas tout de suite : l'onglet n'a pas fini de lire.
      setTimeout(() => URL.revokeObjectURL(adresse), 60_000);
    } catch {
      onglet?.close();
      this.erreur.set("Ce CV n'est pas accessible. Il a pu être retiré, ou il ne vous est pas destiné.");
    } finally {
      this.enCours.set(false);
    }
  }
}

/**
 * Adresse d'un fichier téléversé, pour ce qui reste servi publiquement.
 *
 * Ne convient plus aux CV : ils exigent une authentification, et donc
 * « FichiersService.ouvrirCv ».
 */
export function fichierUrl(chemin: string | null | undefined): string | null {
  if (!chemin) return null;
  if (/^https?:\/\//i.test(chemin)) return chemin;
  return API_ORIGINE + (chemin.startsWith('/') ? chemin : '/' + chemin);
}
