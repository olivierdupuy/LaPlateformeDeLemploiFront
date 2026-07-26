import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { JobOfferService } from '../../services/job-offer';
import { CompanyInfo } from '../../models/job-offer.model';
import { companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-company-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './company-list.html',
  styleUrl: './company-list.scss',
})
export class CompanyList implements OnInit {
  private jobService = inject(JobOfferService);
  companies = signal<CompanyInfo[]>([]);
  total = signal(0);
  loading = signal(true);
  loadingMore = signal(false);
  hasMore = signal(false);
  searchQuery = '';
  companyColor = companyColor;

  private readonly pageSize = 24;
  private page = 1;
  private reqId = 0; // ignore les réponses hors-séquence (recherche / pagination)
  private search$ = new Subject<string>();

  ngOnInit() {
    this.load();
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.load());
  }

  onSearch() { this.search$.next(this.searchQuery); }

  private load() {
    this.loading.set(true);
    this.page = 1;
    const id = ++this.reqId;
    this.jobService.getCompanies({ search: this.searchQuery.trim() || undefined, page: 1, pageSize: this.pageSize })
      .subscribe({
        next: ({ items, total }) => {
          if (id !== this.reqId) return; // réponse obsolète
          this.companies.set(items);
          this.total.set(total);
          // « Charger plus » dépend du remplissage de la page, pas d'un total
          // potentiellement absent (en-tête) ou sur-estimé.
          this.hasMore.set(items.length === this.pageSize);
          this.loading.set(false);
        },
        error: () => { if (id === this.reqId) this.loading.set(false); },
      });
  }

  loadMore() {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    const nextPage = this.page + 1;
    const id = ++this.reqId;
    this.jobService.getCompanies({ search: this.searchQuery.trim() || undefined, page: nextPage, pageSize: this.pageSize })
      .subscribe({
        next: ({ items, total }) => {
          this.loadingMore.set(false);
          if (id !== this.reqId) return; // remplacée par une recherche entre-temps
          this.page = nextPage; // n'avance qu'en cas de succès
          const seen = new Set(this.companies().map((c) => c.company));
          const fresh = items.filter((c) => !seen.has(c.company)); // évite les doublons de clé @for
          this.companies.update((cur) => [...cur, ...fresh]);
          this.total.set(total);
          this.hasMore.set(items.length === this.pageSize);
        },
        error: () => this.loadingMore.set(false),
      });
  }
}
