import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalaryService, SalaryRole } from '../../services/salary.service';
import { JobOfferService, BrowseFacet } from '../../services/job-offer';

@Component({
  selector: 'app-salaries',
  imports: [FormsModule],
  templateUrl: './salaries.html',
  styleUrl: './salaries.scss',
})
export class Salaries implements OnInit {
  private salarySvc = inject(SalaryService);
  private jobSvc = inject(JobOfferService);
  private router = inject(Router);

  roles = signal<SalaryRole[]>([]);
  categories = signal<string[]>([]);
  loading = signal(true);

  /**
   * Secteurs les plus pourvus, pour la rangee de pastilles.
   *
   * La page posait une pastille par categorie — sept cents pastilles, soit
   * une dizaine d'ecrans avant d'atteindre le premier salaire, et toutes
   * dans l'ordre alphabetique : la premiere proposition etait « Accastilleur
   * / Accastilleuse ». Les dix premiers secteurs par volume tiennent sur
   * deux rangees, le menu deroulant garde la liste complete.
   */
  topSectors = signal<BrowseFacet[]>([]);

  q = '';
  sector = '';

  ngOnInit() {
    this.jobSvc.getCategories().subscribe((c) => this.categories.set(c));
    this.jobSvc.getBrowseSection('categories', { pageSize: 10 })
      .subscribe((p) => this.topSectors.set(p.items));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.salarySvc.getRoles(this.sector || undefined, this.q || undefined).subscribe({
      next: (r) => { this.roles.set(r.roles); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /** Pastille : un second clic sur le secteur actif le retire. */
  pickSector(s: string) { this.sector = this.sector === s ? '' : s; this.load(); }

  /** Menu : la valeur choisie remplace, elle ne bascule pas. */
  setSector(s: string) { this.sector = s; this.load(); }

  isTopSector(s: string): boolean {
    return !!s && this.topSectors().some((f) => f.label === s);
  }

  goToRole(title: string) { this.router.navigate(['/salaires/metier', title]); }

  euros(n: number): string {
    return n ? n.toLocaleString('fr-FR') + ' €' : '—';
  }
}
