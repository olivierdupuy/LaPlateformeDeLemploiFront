import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CandidateService } from '../../services/candidate.service';
import { CandidatePublicProfile } from '../../models/auth.model';

@Component({
  selector: 'app-candidate-profile',
  imports: [RouterLink, DatePipe],
  templateUrl: './candidate-profile.html',
  styleUrl: './candidate-profile.scss',
})
export class CandidateProfile implements OnInit {
  private route = inject(ActivatedRoute);
  private candidateService = inject(CandidateService);

  candidate = signal<CandidatePublicProfile | null>(null);
  loading = signal(true);

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.candidateService.getById(id).subscribe({
        next: (c) => { this.candidate.set(c); this.loading.set(false); },
        error: () => { this.loading.set(false); },
      });
    }
  }

  getInitials(): string {
    const c = this.candidate();
    if (!c) return '';
    return (c.firstName?.charAt(0) || '') + (c.lastName?.charAt(0) || '');
  }

  avatarColor(): { bg: string; fg: string } {
    const c = this.candidate();
    if (!c) return { bg: '#f1f5f9', fg: '#64748b' };
    const hue = (c.firstName.charCodeAt(0) * 7 + (c.firstName.charCodeAt(1) || 0) * 13) % 360;
    return { bg: `hsl(${hue}, 45%, 92%)`, fg: `hsl(${hue}, 55%, 35%)` };
  }
}
