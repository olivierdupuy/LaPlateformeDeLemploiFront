import { Component, OnInit, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { SalaryService, SalaryRole } from '../../services/salary.service';
import { JobOfferService } from '../../services/job-offer';

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

  q = '';
  sector = '';

  ngOnInit() {
    this.jobSvc.getCategories().subscribe((c) => this.categories.set(c));
    this.load();
  }

  load() {
    this.loading.set(true);
    this.salarySvc.getRoles(this.sector || undefined, this.q || undefined).subscribe({
      next: (r) => { this.roles.set(r.roles); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  pickSector(s: string) { this.sector = this.sector === s ? '' : s; this.load(); }

  goToRole(title: string) { this.router.navigate(['/salaires/metier', title]); }

  euros(n: number): string {
    return n ? n.toLocaleString('fr-FR') + ' €' : '—';
  }
}
