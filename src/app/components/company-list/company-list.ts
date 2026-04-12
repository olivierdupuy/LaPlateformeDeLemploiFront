import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
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
  allCompanies = signal<CompanyInfo[]>([]);
  loading = signal(true);
  searchQuery = '';
  companyColor = companyColor;

  filtered = computed(() => {
    const q = this.searchQuery.toLowerCase().trim();
    if (!q) return this.allCompanies();
    return this.allCompanies().filter(c =>
      c.company.toLowerCase().includes(q) || c.locations.some(l => l.toLowerCase().includes(q))
    );
  });

  totalJobs = computed(() => this.allCompanies().reduce((s, c) => s + c.jobCount, 0));

  ngOnInit() {
    this.jobService.getCompanies().subscribe((c) => {
      this.allCompanies.set(c);
      this.loading.set(false);
    });
  }
}
