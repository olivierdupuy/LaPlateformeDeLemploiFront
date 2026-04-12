import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { SavedSearchService } from '../../services/saved-search.service';
import { SavedSearch } from '../../models/job-offer.model';

@Component({
  selector: 'app-saved-searches',
  imports: [DatePipe],
  templateUrl: './saved-searches.html',
  styleUrl: './saved-searches.scss',
})
export class SavedSearches implements OnInit {
  private searchService = inject(SavedSearchService);
  private router = inject(Router);
  private toastr = inject(ToastrService);

  searches = signal<SavedSearch[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.searchService.getAll().subscribe({
      next: (data) => { this.searches.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  runSearch(s: SavedSearch) {
    const params: any = {};
    if (s.query) params.q = s.query;
    if (s.category) params.category = s.category;
    if (s.contractType) params.contractType = s.contractType;
    if (s.isRemote) params.remote = true;
    if (s.location) params.location = s.location;
    this.router.navigate(['/offres'], { queryParams: params });
  }

  deleteSearch(id: number) {
    this.searchService.delete(id).subscribe({
      next: () => {
        this.searches.update((list) => list.filter((s) => s.id !== id));
        this.toastr.success('Recherche supprimee');
      },
      error: () => this.toastr.error('Erreur lors de la suppression'),
    });
  }
}
