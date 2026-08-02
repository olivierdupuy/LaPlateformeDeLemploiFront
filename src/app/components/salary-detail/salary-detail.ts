import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SalaryService, SalaryEstimate } from '../../services/salary.service';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { Modale } from '../../utils/modale.directive';

@Component({
  selector: 'app-salary-detail',
  imports: [RouterLink, FormsModule, Modale],
  templateUrl: './salary-detail.html',
  styleUrl: './salary-detail.scss',
})
export class SalaryDetail implements OnInit {
  private route = inject(ActivatedRoute);
  private salarySvc = inject(SalaryService);
  private toastr = inject(ToastrService);
  auth = inject(AuthService);
  private seo = inject(SeoService);

  title = '';
  estimate = signal<SalaryEstimate | null>(null);
  loading = signal(true);

  contribOpen = signal(false);
  submitting = signal(false);
  contribForm: any = { amountAnnual: null, company: '', location: '', contractType: '', experienceLevel: '' };
  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
  experienceLevels = ['Junior', 'Intermediaire', 'Senior', 'Expert'];

  ngOnInit() {
    this.route.paramMap.subscribe((p) => {
      this.title = p.get('title') || '';

      // « Salaire <métier> » est une requête très cherchée, et la page
      // qui y répondait portait le même titre générique que toutes les
      // autres. Posé avant l'appel : si l'estimation tarde, le titre
      // est déjà juste.
      const metier = decodeURIComponent(this.title);
      this.seo.set({
        title: `Salaire ${metier} — combien gagne-t-on ?`,
        description: `Salaire moyen, fourchette et écarts par ville pour le métier de ${metier}, d'après les données de la plateforme.`,
        canonicalPath: `/salaires/metier/${this.title}`,
      });

      this.seo.breadcrumb([
        { nom: 'Salaires', chemin: '/salaires' },
        { nom: metier, chemin: `/salaires/metier/${this.title}` },
      ]);

      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.salarySvc.getEstimate(this.title).subscribe({
      next: (e) => { this.estimate.set(e); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  euros(n: number): string { return n ? n.toLocaleString('fr-FR') + ' €' : '—'; }

  /** Position (%) d'une valeur sur la barre min→max. */
  pct(value: number): number {
    const e = this.estimate();
    if (!e || e.maxAnnual === e.minAnnual) return 50;
    return Math.max(0, Math.min(100, ((value - e.minAnnual) / (e.maxAnnual - e.minAnnual)) * 100));
  }
  barWidth(value: number, max: number): number {
    return max ? Math.round((value / max) * 100) : 0;
  }

  // ── Contribution ──
  openContribute() {
    if (!this.auth.isLoggedIn()) { this.toastr.info('Connectez-vous pour partager un salaire'); return; }
    this.contribForm = { amountAnnual: null, company: '', location: '', contractType: '', experienceLevel: '' };
    this.contribOpen.set(true);
  }
  closeContribute() { this.contribOpen.set(false); }
  submitContribute() {
    if (!this.contribForm.amountAnnual || this.contribForm.amountAnnual < 1000) {
      this.toastr.warning('Indiquez un salaire annuel valide');
      return;
    }
    this.submitting.set(true);
    this.salarySvc.contribute({ jobTitle: this.title, ...this.contribForm }).subscribe({
      next: (r) => { this.submitting.set(false); this.contribOpen.set(false); this.toastr.success(r.message, 'Merci !'); this.load(); },
      error: (err) => { this.submitting.set(false); this.toastr.error(err.error?.message || 'Erreur'); },
    });
  }
}
