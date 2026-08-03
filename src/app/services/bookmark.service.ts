import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, switchMap, tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

const STORAGE_KEY = 'lpde_bookmarks';
const REPRISE_FAITE = 'lpde_bookmarks_reprise';

export interface FavoriServeur {
  id: number;
  jobOfferId: number;
  createdAt: string;
  offre: {
    id: number;
    title: string;
    company: string;
    location?: string;
    contractType?: string;
    isRemote?: boolean;
    isActive?: boolean;
    createdAt: string;
  };
}

/**
 * Les favoris, desormais tenus par le serveur.
 *
 * Ils vivaient dans le stockage local — ici et sur le telephone, sous la
 * meme clef, sans jamais se rejoindre. Mettre une offre de cote au bureau
 * ne la faisait pas apparaitre dans le train, et vider son navigateur les
 * emportait sans prevenir.
 *
 * Le signal reste : les gabarits lisent `isBookmarked` a chaque ligne de
 * liste, et il leur faut une reponse immediate. Il ne fait plus autorite,
 * il reflete ce que le serveur a confirme.
 */
@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private http = inject(HttpClient);
  private api = `${environment.apiUrl}/favoris`;

  private ids = signal<number[]>([]);
  count = computed(() => this.ids().length);

  isBookmarked(id: number): boolean {
    return this.ids().includes(id);
  }

  getAll(): number[] {
    return this.ids();
  }

  /**
   * A appeler une fois la session ouverte. Verse au passage les favoris
   * restes dans le stockage local : sans cette reprise, activer la
   * synchronisation aurait commence par effacer ce que les gens avaient
   * deja mis de cote.
   */
  synchroniser(): Observable<number[]> {
    const locaux = this.lireLocaux();
    const aReprendre = locaux.length > 0 && localStorage.getItem(REPRISE_FAITE) !== 'true';

    if (!aReprendre) return this.rafraichir();

    return this.http
      .post<{ ajoutes: number; ignores: number }>(`${this.api}/reprise`, { jobOfferIds: locaux })
      .pipe(
        tap(() => {
          localStorage.setItem(REPRISE_FAITE, 'true');
          localStorage.removeItem(STORAGE_KEY);
        }),
        catchError(() => of(null)),
        switchMap(() => this.rafraichir()),
      );
  }

  private rafraichir(): Observable<number[]> {
    return this.http.get<number[]>(`${this.api}/ids`).pipe(
      tap((ids) => this.ids.set(ids ?? [])),
      catchError(() => of([] as number[])),
    );
  }

  /** Les offres completes, telles que le serveur les rend. */
  lister(): Observable<FavoriServeur[]> {
    return this.http.get<FavoriServeur[]>(this.api).pipe(
      tap((favoris) => this.ids.set((favoris ?? []).map((f) => f.jobOfferId))),
      catchError(() => of([] as FavoriServeur[])),
    );
  }

  /** Bascule l'etat, et revient en arriere si le serveur refuse. */
  toggle(id: number): Observable<boolean> {
    const etait = this.isBookmarked(id);
    this.ids.update((l) => (etait ? l.filter((i) => i !== id) : [...l, id]));

    const appel = etait
      ? this.http.delete(`${this.api}/${id}`)
      : this.http.post(this.api, { jobOfferId: id });

    return appel.pipe(
      switchMap(() => of(!etait)),
      catchError(() => {
        this.ids.update((l) => (etait ? [...l, id] : l.filter((i) => i !== id)));
        return of(etait);
      }),
    );
  }

  /** Vide la copie locale a la deconnexion : les favoris ne sont pas publics. */
  oublier(): void {
    this.ids.set([]);
  }

  private lireLocaux(): number[] {
    try {
      const brut = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(brut) ? brut.filter((n) => typeof n === 'number') : [];
    } catch {
      return [];
    }
  }
}
