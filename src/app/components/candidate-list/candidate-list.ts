import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CandidateService } from '../../services/candidate.service';
import { CandidatePublicProfile } from '../../models/auth.model';
import { companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-candidate-list',
  imports: [RouterLink],
  templateUrl: './candidate-list.html',
  styleUrl: './candidate-list.scss',
})
export class CandidateList implements OnInit {
  private candidateService = inject(CandidateService);

  candidates = signal<CandidatePublicProfile[]>([]);
  loading = signal(true);
  searchTerm = signal('');

  companyColor = companyColor;

  ngOnInit() {
    this.load();
  }

  load(search?: string) {
    this.loading.set(true);
    this.candidateService.getAll(search).subscribe({
      next: (data) => { this.candidates.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  onSearch(event: Event) {
    const val = (event.target as HTMLInputElement).value;
    this.searchTerm.set(val);
    this.load(val || undefined);
  }

  getInitials(c: CandidatePublicProfile): string {
    return (c.firstName?.charAt(0) || '') + (c.lastName?.charAt(0) || '');
  }

  avatarColor(name: string): { bg: string; fg: string } {
    const hue = (name.charCodeAt(0) * 7 + (name.charCodeAt(1) || 0) * 13) % 360;
    return { bg: `hsl(${hue}, 45%, 92%)`, fg: `hsl(${hue}, 55%, 35%)` };
  }
}
