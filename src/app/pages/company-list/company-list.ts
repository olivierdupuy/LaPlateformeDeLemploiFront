import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CompanyService } from '../../services/company.service';
import { SeoService } from '../../services/seo.service';
import { Company } from '../../models/company.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-company-list',
  imports: [CommonModule, RouterLink],
  templateUrl: './company-list.html',
  styleUrl: './company-list.css'
})
export class CompanyList implements OnInit {
  companies: Company[] = [];
  loading = true;

  constructor(
    private companyService: CompanyService,
    private seo: SeoService,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.seo.setPage('Entreprises', 'Decouvrez les entreprises qui recrutent sur La Plateforme de l\'Emploi. Consultez leurs offres et postulez directement.');
    this.companyService.getAll().subscribe({
      next: companies => {
        this.companies = companies;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.toastr.error('Erreur lors du chargement des entreprises');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }
}
