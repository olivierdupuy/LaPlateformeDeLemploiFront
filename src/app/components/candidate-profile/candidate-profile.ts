import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { CandidateService } from '../../services/candidate.service';
import { CandidatePublicProfile } from '../../models/auth.model';
import { companyColor } from '../../utils/job.utils';
import { ConsoleShell } from '../console-shell/console-shell';

@Component({
  selector: 'app-candidate-profile',
  imports: [RouterLink, DatePipe, ConsoleShell],
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

  /**
   * La pastille reprend la palette du produit.
   *
   * Elle tirait une teinte au hasard sur les 360 degres du cercle a
   * partir du prenom : un candidat pouvait arriver en vert pomme ou en
   * fuchsia au milieu d'une interface bleue. `companyColor` tient la
   * meme promesse — une couleur stable par personne — dans les sept
   * crans de la rampe de marque.
   */
  avatarColor(): { bg: string; fg: string } {
    const c = this.candidate();
    if (!c) return { bg: 'var(--bleu-100)', fg: 'var(--bleu-700)' };
    return companyColor(`${c.firstName} ${c.lastName}`);
  }

  /** Les competences en liste, pour en faire des liens de recherche. */
  skillList(): string[] {
    return (this.candidate()?.skills ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
}
