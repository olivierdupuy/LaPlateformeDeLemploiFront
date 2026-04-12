import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { JobOfferService } from '../../services/job-offer';
import { BookmarkService } from '../../services/bookmark.service';
import { JobOffer } from '../../models/job-offer.model';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-bookmarks',
  imports: [RouterLink],
  templateUrl: './bookmarks.html',
  styleUrl: './bookmarks.scss',
})
export class Bookmarks implements OnInit {
  private jobService = inject(JobOfferService);
  bookmarkService = inject(BookmarkService);

  jobs = signal<JobOffer[]>([]);
  loading = signal(true);

  getTimeAgo = getTimeAgo;
  getTags = getTags;
  getContractBadgeClass = getContractBadgeClass;
  companyColor = companyColor;

  ngOnInit() {
    const ids = this.bookmarkService.getAll();
    if (ids.length === 0) { this.loading.set(false); return; }
    this.jobService.getAll().subscribe((all) => {
      this.jobs.set(all.filter((j) => ids.includes(j.id)));
      this.loading.set(false);
    });
  }

  removeBookmark(id: number) {
    this.bookmarkService.toggle(id);
    this.jobs.update((list) => list.filter((j) => j.id !== id));
  }
}
