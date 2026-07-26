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
  private search$ = new Subject<string>();

  ngOnInit() {
    this.load();
    this.search$.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.load());
  }

  onSearch() { this.search$.next(this.searchQuery); }

  private load() {
    this.loading.set(true);
    this.page = 1;
    this.jobService.getCompanies({ search: this.searchQuery.trim() || undefined, page: 1, pageSize: this.pageSize })
      .subscribe(({ items, total }) => {
        this.companies.set(items);
        this.total.set(total);
        this.hasMore.set(items.length < total);
        this.loading.set(false);
      });
  }

  loadMore() {
    if (this.loadingMore()) return;
    this.loadingMore.set(true);
    this.page += 1;
    this.jobService.getCompanies({ search: this.searchQuery.trim() || undefined, page: this.page, pageSize: this.pageSize })
      .subscribe({
        next: ({ items, total }) => {
          this.companies.update((cur) => [...cur, ...items]);
          this.total.set(total);
          this.hasMore.set(this.companies().length < total);
          this.loadingMore.set(false);
        },
        error: () => this.loadingMore.set(false),
      });
  }
}
