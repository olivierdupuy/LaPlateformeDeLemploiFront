import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { RecommendationService } from '../../services/recommendation.service';
import { CategoryService } from '../../services/category.service';
import { AuthService } from '../../services/auth.service';
import { SeoService } from '../../services/seo.service';
import { JobPreferences } from '../../models/preferences.model';
import { Category } from '../../models/category.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-preferences',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './preferences.html',
  styleUrl: './preferences.css'
})
export class Preferences implements OnInit {
  categories: Category[] = [];
  saving = false;
  loading = true;

  contractTypes = ['CDI', 'CDD', 'Stage', 'Alternance', 'Freelance'];
  selectedContracts: Set<string> = new Set();
  locations = '';
  selectedCategories: Set<number> = new Set();
  minSalary: number | null = null;
  preferRemote: boolean = false;
  keywords = '';

  constructor(
    public auth: AuthService,
    private recService: RecommendationService,
    private catService: CategoryService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private seo: SeoService
  ) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Mes preferences', 'Configurez vos preferences de recherche d\'emploi pour des recommandations personnalisees.');
    this.catService.getAll().subscribe(c => { this.categories = c; this.cdr.detectChanges(); });

    this.recService.getPreferences().subscribe({
      next: p => {
        p.desiredContractTypes.forEach(c => this.selectedContracts.add(c));
        this.locations = p.desiredLocations.join(', ');
        p.desiredCategoryIds.forEach(c => this.selectedCategories.add(c));
        this.minSalary = p.minSalary;
        this.preferRemote = p.preferRemote ?? false;
        this.keywords = p.keywords.join(', ');
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => { this.loading = false; this.cdr.detectChanges(); }
    });
  }

  toggleContract(c: string): void {
    this.selectedContracts.has(c) ? this.selectedContracts.delete(c) : this.selectedContracts.add(c);
    this.cdr.detectChanges();
  }

  toggleCategory(id: number): void {
    this.selectedCategories.has(id) ? this.selectedCategories.delete(id) : this.selectedCategories.add(id);
    this.cdr.detectChanges();
  }

  save(): void {
    this.saving = true;
    const prefs: JobPreferences = {
      desiredContractTypes: Array.from(this.selectedContracts),
      desiredLocations: this.locations.split(',').map(s => s.trim()).filter(s => s),
      desiredCategoryIds: Array.from(this.selectedCategories),
      minSalary: this.minSalary,
      preferRemote: this.preferRemote,
      keywords: this.keywords.split(',').map(s => s.trim()).filter(s => s)
    };

    this.recService.savePreferences(prefs).subscribe({
      next: () => {
        this.saving = false;
        this.toastr.success('Preferences enregistrees !');
        this.router.navigate(['/recommandations']);
      },
      error: () => { this.saving = false; this.toastr.error('Erreur'); this.cdr.detectChanges(); }
    });
  }
}
