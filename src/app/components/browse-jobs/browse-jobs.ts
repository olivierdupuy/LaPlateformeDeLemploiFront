import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobOfferService } from '../../services/job-offer';

interface BrowseItem { label: string; count: number; }

@Component({
  selector: 'app-browse-jobs',
  imports: [RouterLink],
  templateUrl: './browse-jobs.html',
  styleUrl: './browse-jobs.scss',
})
export class BrowseJobs implements OnInit {
  private jobService = inject(JobOfferService);

  categories = signal<BrowseItem[]>([]);
  locations = signal<BrowseItem[]>([]);
  contractTypes = signal<BrowseItem[]>([]);
  loading = signal(true);

  ngOnInit() {
    this.jobService.getBrowse().subscribe({
      next: (d) => {
        this.categories.set(d.categories || []);
        this.locations.set(d.locations || []);
        this.contractTypes.set(d.contractTypes || []);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  get total(): number {
    return this.categories().reduce((s, c) => s + c.count, 0);
  }
}
