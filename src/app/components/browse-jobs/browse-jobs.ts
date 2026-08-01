import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { JobOfferService, BrowseFacet, BrowseSection } from '../../services/job-offer';

const PAGE_SIZE = 24;

/**
 * Etat d'une des trois listes de la page. Chacune vit sa vie : elle charge, se
 * pagine et se filtre sans rien attendre des deux autres.
 */
class SectionState {
  items = signal<BrowseFacet[]>([]);
  total = signal(0);
  loading = signal(true);
  loadingMore = signal(false);
  failed = signal(false);
  search = signal('');
  page = 1;
  searchTimer?: ReturnType<typeof setTimeout>;

  hasMore = computed(() => this.items().length < this.total());
}

interface SectionConfig {
  key: BrowseSection;
  title: string;
  /** Nom du parametre attendu par /offres pour ce type d'entree. */
  param: 'category' | 'location' | 'contractType';
  searchable: boolean;
  placeholder: string;
  empty: string;
  noMatch: string;
  more: string;
}

@Component({
  selector: 'app-browse-jobs',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './browse-jobs.html',
  styleUrl: './browse-jobs.scss',
})
export class BrowseJobs implements OnInit {
  private jobService = inject(JobOfferService);

  readonly sections: SectionConfig[] = [
    {
      key: 'categories',
      title: 'Par métier',
      param: 'category',
      searchable: true,
      placeholder: 'Filtrer les métiers…',
      empty: 'Aucun métier pour le moment.',
      noMatch: 'Aucun métier ne correspond à ce filtre.',
      more: 'Voir plus de métiers',
    },
    {
      key: 'locations',
      title: 'Par ville',
      param: 'location',
      searchable: true,
      placeholder: 'Filtrer les villes…',
      empty: 'Aucune ville pour le moment.',
      noMatch: 'Aucune ville ne correspond à ce filtre.',
      more: 'Voir plus de villes',
    },
    {
      key: 'contractTypes',
      title: 'Par type de contrat',
      param: 'contractType',
      searchable: false,
      placeholder: '',
      empty: 'Aucun contrat pour le moment.',
      noMatch: 'Aucun contrat ne correspond à ce filtre.',
      more: 'Voir plus de contrats',
    },
  ];

  private states = new Map<BrowseSection, SectionState>(
    this.sections.map((s) => [s.key, new SectionState()])
  );

  /** Squelettes affiches tant qu'une section n'a pas repondu. */
  readonly placeholders = Array.from({ length: 12 });

  ngOnInit() {
    // Trois appels distincts : la liste des contrats s'affiche en general avant
    // que celle des metiers, autrement plus lourde, ne soit revenue.
    for (const s of this.sections) this.load(s.key);
  }

  state(key: BrowseSection): SectionState {
    return this.states.get(key)!;
  }

  queryParams(section: SectionConfig, facet: BrowseFacet): Record<string, string> {
    return { [section.param]: facet.label };
  }

  onSearch(key: BrowseSection, value: string) {
    const st = this.state(key);
    st.search.set(value);
    clearTimeout(st.searchTimer);
    st.searchTimer = setTimeout(() => this.load(key), 250);
  }

  clearSearch(key: BrowseSection) {
    const st = this.state(key);
    if (!st.search()) return;
    st.search.set('');
    clearTimeout(st.searchTimer);
    this.load(key);
  }

  loadMore(key: BrowseSection) {
    const st = this.state(key);
    if (st.loadingMore() || !st.hasMore()) return;
    this.load(key, true);
  }

  retry(key: BrowseSection) {
    this.load(key);
  }

  private load(key: BrowseSection, append = false) {
    const st = this.state(key);
    st.page = append ? st.page + 1 : 1;
    (append ? st.loadingMore : st.loading).set(true);
    st.failed.set(false);

    const requestedPage = st.page;
    const requestedSearch = st.search().trim();

    this.jobService
      .getBrowseSection(key, { search: requestedSearch, page: requestedPage, pageSize: PAGE_SIZE })
      .subscribe({
        next: (res) => {
          // Une frappe rapide peut faire revenir une reponse perimee : on la jette.
          if (requestedPage !== st.page || requestedSearch !== st.search().trim()) return;
          st.items.set(append ? [...st.items(), ...res.items] : res.items);
          st.total.set(res.total);
          st.loading.set(false);
          st.loadingMore.set(false);
        },
        error: () => {
          if (append) st.page -= 1;
          st.failed.set(true);
          st.loading.set(false);
          st.loadingMore.set(false);
        },
      });
  }
}
