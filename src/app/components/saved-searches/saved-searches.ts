import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { SavedSearchService } from '../../services/saved-search.service';
import { CandidateFeaturesService } from '../../services/candidate-features.service';
import { SavedSearch } from '../../models/job-offer.model';
import { ConsoleShell } from '../console-shell/console-shell';
import { Explication } from '../explication/explication';

@Component({
  selector: 'app-saved-searches',
  // RouterLink manquait : les deux boutons « Voir les offres » du gabarit
  // portaient l'attribut sans que la directive soit là pour le lire. Angular
  // ne s'en plaint pas — c'est un attribut valide sur une ancre — et le
  // bouton ne faisait donc rien du tout.
  imports: [DatePipe, ConsoleShell, RouterLink, Explication],
  templateUrl: './saved-searches.html',
  styleUrl: './saved-searches.scss',
})
export class SavedSearches implements OnInit {
  private searchService = inject(SavedSearchService);
  private candidateService = inject(CandidateFeaturesService);
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

  toggleAlert(s: any) {
    this.candidateService.toggleSearchAlert(s.id).subscribe({
      next: (res) => {
        s.alertEnabled = res.alertEnabled;
        this.toastr.success(res.alertEnabled ? 'Alerte activée' : 'Alerte désactivée');
      },
      error: () => this.toastr.error('Erreur'),
    });
  }

  deleteSearch(id: number) {
    this.searchService.delete(id).subscribe({
      next: () => {
        this.searches.update((list) => list.filter((s) => s.id !== id));
        this.toastr.success('Recherche supprimée');
      },
      error: () => this.toastr.error('Erreur lors de la suppression'),
    });
  }
}
