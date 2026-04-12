import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { JobOfferService } from '../../services/job-offer';
import { BookmarkService } from '../../services/bookmark.service';
import { JobOffer } from '../../models/job-offer.model';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-company-detail',
  imports: [RouterLink],
  templateUrl: './company-detail.html',
  styleUrl: './company-detail.scss',
})
export class CompanyDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private jobService = inject(JobOfferService);
  bookmarkService = inject(BookmarkService);

  companyName = '';
  jobs = signal<JobOffer[]>([]);
  loading = signal(true);

  getTimeAgo = getTimeAgo;
  getTags = getTags;
  getContractBadgeClass = getContractBadgeClass;
  companyColor = companyColor;

  ngOnInit() {
    this.companyName = decodeURIComponent(this.route.snapshot.paramMap.get('name') || '');
    this.jobService.getByCompany(this.companyName).subscribe((jobs) => {
      this.jobs.set(jobs);
      this.loading.set(false);
    });
  }
}
