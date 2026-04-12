import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';
import { CandidatePublicProfile } from '../../models/auth.model';
import { companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-candidate-list',
  imports: [RouterLink, FormsModule],
  templateUrl: './candidate-list.html',
  styleUrl: './candidate-list.scss',
})
export class CandidateList implements OnInit {
  private recruiterService = inject(RecruiterFeaturesService);

  candidates = signal<any[]>([]);
  loading = signal(true);
  companyColor = companyColor;

  // Filters
  search = '';
  skills = '';
  city = '';
  minExperience: number | undefined;
  maxExperience: number | undefined;
  education = '';
  sort = '';
  showFilters = false;

  ngOnInit() { this.loadCandidates(); }

  loadCandidates() {
    this.loading.set(true);
    this.recruiterService.searchCandidates({
      search: this.search || undefined,
      skills: this.skills || undefined,
      city: this.city || undefined,
      minExperience: this.minExperience,
      maxExperience: this.maxExperience,
      education: this.education || undefined,
      sort: this.sort || undefined,
    }).subscribe({
      next: (data) => { this.candidates.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  clearFilters() {
    this.search = ''; this.skills = ''; this.city = '';
    this.minExperience = undefined; this.maxExperience = undefined;
    this.education = ''; this.sort = '';
    this.loadCandidates();
  }

  getInitials(c: any): string {
    return (c.firstName?.charAt(0) || '') + (c.lastName?.charAt(0) || '');
  }
}
