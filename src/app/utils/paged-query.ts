import { DestroyRef, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Observable, Subject, catchError, debounceTime, map, merge, of, switchMap, tap } from 'rxjs';

/**
 * Liste paginée pilotée par l'URL.
 *
 * Les explorateurs du panneau partagent la même mécanique : les critères
 * vivent dans l'URL, chaque changement redemande une page au serveur, et
 * les compteurs viennent des facettes calculées sur l'ensemble filtré.
 *
 * Le passage par l'URL n'est pas décoratif : c'est ce qui permet à un
 * graphique d'ouvrir une liste déjà filtrée sans rien savoir de la page
 * qu'il vise, et à cette liste d'être partagée ou rechargée telle quelle.
 */

export interface PagedResponse<T, F> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  facets: F;
}

export interface PagedQueryConfig<T, F> {
  /** Appel HTTP, recevant les paramètres déjà traduits pour l'API. */
  fetch: (apiParams: Record<string, string>) => Observable<PagedResponse<T, F>>;
  /** Traduit les paramètres d'URL (en français, lisibles) en paramètres d'API. */
  toApi: (urlParams: Record<string, string>) => Record<string, string>;
  /** Valeur affichée tant qu'aucune réponse n'est arrivée. */
  emptyFacets: F;
}

export function pagedQuery<T, F>(config: PagedQueryConfig<T, F>) {
  const route = inject(ActivatedRoute);
  const router = inject(Router);
  const destroyRef = inject(DestroyRef);

  const loading = signal(true);
  const failed = signal(false);

  const params = toSignal(
    route.queryParams.pipe(map((p) => ({ ...p }) as Record<string, string>)),
    { initialValue: {} as Record<string, string> },
  );

  const empty: PagedResponse<T, F> = {
    items: [], total: 0, page: 1, pageSize: 25, facets: config.emptyFacets,
  };

  /** Redemande la page courante sans passer par l'URL, qui n'a pas changé. */
  const refresh$ = new Subject<void>();

  /**
   * switchMap abandonne la requête en cours dès qu'un critère change :
   * en tapant dans la recherche, seule la dernière réponse compte, et une
   * réponse lente ne peut plus écraser une plus récente.
   */
  const response = toSignal(
    merge(toObservable(params), refresh$.pipe(map(() => params()))).pipe(
      tap(() => { loading.set(true); failed.set(false); }),
      switchMap((p) =>
        config.fetch(config.toApi(p)).pipe(
          catchError(() => { failed.set(true); return of(empty); }),
        ),
      ),
      tap(() => loading.set(false)),
    ),
    { initialValue: empty },
  );

  const items = computed(() => response().items);
  const total = computed(() => response().total);
  const facets = computed(() => response().facets);

  const page = computed(() => Math.max(1, Number(params()['page'] ?? 1) || 1));
  const pageSize = computed(() => Number(params()['taille'] ?? 25) || 25);
  const pageCount = computed(() => Math.max(1, Math.ceil(total() / pageSize())));

  /** Bornes affichées : « 26 – 50 sur 148 ». */
  const range = computed(() => {
    const t = total();
    if (!t) return { from: 0, to: 0 };
    const from = (page() - 1) * pageSize() + 1;
    return { from, to: Math.min(t, from + pageSize() - 1) };
  });

  const write = (patch: Record<string, string | number | null>, replaceUrl = false) => {
    router.navigate([], {
      relativeTo: route,
      queryParams: patch,
      queryParamsHandling: 'merge',
      replaceUrl,
    });
  };

  /**
   * Changer un critère ramène à la première page : rester en page 7 d'une
   * liste qui n'en compte plus que deux afficherait un vide trompeur.
   */
  const setParam = (key: string, value: string | number | null) => {
    write({ [key]: value || null, page: null });
  };

  const setPage = (value: number) => {
    write({ page: value <= 1 ? null : value });
    // Une nouvelle page se lit depuis le haut du tableau.
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const setPageSize = (value: number) => {
    write({ taille: value === 25 ? null : value, page: null });
  };

  const clearAll = () => router.navigate([], { relativeTo: route });

  // La frappe ne doit pas déclencher une requête par caractère, ni
  // empiler une entrée d'historique par lettre saisie.
  const searchInput = new Subject<string>();
  searchInput
    .pipe(debounceTime(300), takeUntilDestroyed(destroyRef))
    .subscribe((value) => write({ q: value || null, page: null }, true));

  return {
    params, items, total, facets, loading, failed,
    page, pageSize, pageCount, range,
    setParam, setPage, setPageSize, clearAll,
    onSearch: (value: string) => searchInput.next(value),
    refresh: () => refresh$.next(),
  };
}
