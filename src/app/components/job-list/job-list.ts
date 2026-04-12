import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { JobOfferService } from '../../services/job-offer';
import { BookmarkService } from '../../services/bookmark.service';
import { SearchHistoryService } from '../../services/search-history.service';
import { JobOffer } from '../../models/job-offer.model';
import { getTimeAgo, getTags, getContractBadgeClass, companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-job-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './job-list.html',
  styleUrl: './job-list.scss',
})
export class JobList implements OnInit {
  private jobService = inject(JobOfferService);
  private route = inject(ActivatedRoute);
  bookmarkService = inject(BookmarkService);
  searchHistory = inject(SearchHistoryService);

  jobs = signal<JobOffer[]>([]);
  categories = signal<string[]>([]);
  loading = signal(true);

  search = '';
  category = '';
  contractType = '';
  isRemote: boolean | undefined;
  salaryMin: number | undefined;
  salaryMax: number | undefined;
  experience = '';
  education = '';
  sort = '';
  showAdvanced = false;
  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
  experienceLevels = ['Junior', 'Intermediaire', 'Senior', 'Expert'];
  educationLevels = ['Bac', 'Bac+2', 'Bac+3', 'Bac+5', 'Doctorat'];

  getTimeAgo = getTimeAgo;
  getTags = getTags;
  getContractBadgeClass = getContractBadgeClass;
  companyColor = companyColor;

  ngOnInit() {
    this.jobService.getCategories().subscribe((c) => this.categories.set(c));
    this.route.queryParams.subscribe((params) => {
      this.search = params['search'] || '';
      this.category = params['category'] || '';
      this.contractType = params['contractType'] || '';
      if (params['isRemote'] === 'true') this.isRemote = true;
      this.loadJobs();
    });
  }

  loadJobs() {
    this.loading.set(true);
    if (this.search) this.searchHistory.add(this.search);
    const filters: any = {};
    if (this.search) filters.search = this.search;
    if (this.category) filters.category = this.category;
    if (this.contractType) filters.contractType = this.contractType;
    if (this.isRemote !== undefined) filters.isRemote = this.isRemote;
    if (this.salaryMin) filters.salaryMin = this.salaryMin;
    if (this.salaryMax) filters.salaryMax = this.salaryMax;
    if (this.experience) filters.experience = this.experience;
    if (this.education) filters.education = this.education;
    if (this.sort) filters.sort = this.sort;

    this.jobService.getAll(filters).subscribe((jobs) => {
      this.jobs.set(jobs);
      this.loading.set(false);
    });
  }

  clearFilters() {
    this.search = '';
    this.category = '';
    this.contractType = '';
    this.isRemote = undefined;
    this.salaryMin = undefined;
    this.salaryMax = undefined;
    this.experience = '';
    this.education = '';
    this.sort = '';
    this.loadJobs();
  }

  get hasAdvancedFilters(): boolean {
    return !!(this.salaryMin || this.salaryMax || this.experience || this.education || this.sort);
  }

  useRecentSearch(q: string) {
    this.search = q;
    this.loadJobs();
  }
}
