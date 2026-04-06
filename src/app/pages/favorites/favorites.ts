import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApplicationService } from '../../services/application.service';
import { SeoService } from '../../services/seo.service';
import { FavoriteDto } from '../../models/application.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-favorites',
  imports: [CommonModule, RouterLink],
  templateUrl: './favorites.html',
  styleUrl: './favorites.css'
})
export class Favorites implements OnInit {
  favorites: FavoriteDto[] = [];
  loading = true;

  constructor(private appService: ApplicationService, private toastr: ToastrService, private cdr: ChangeDetectorRef, private seo: SeoService) {}

  ngOnInit(): void {
    this.seo.setNoIndex('Mes favoris', 'Retrouvez les offres d\'emploi que vous avez sauvegardees.');
    this.appService.getMyFavorites().subscribe({ next: f => { this.favorites = f; this.loading = false; this.cdr.detectChanges(); } });
  }

  removeFavorite(fav: FavoriteDto): void {
    this.appService.toggleFavorite(fav.jobOffer.id).subscribe({
      next: () => { this.favorites = this.favorites.filter(f => f.id !== fav.id); this.toastr.success('Retire des favoris'); this.cdr.detectChanges(); }
    });
  }

  getContractBadgeClass(t: string): string {
    return { 'CDI': 'badge-cdi', 'CDD': 'badge-cdd', 'Stage': 'badge-stage', 'Alternance': 'badge-alternance', 'Freelance': 'badge-freelance' }[t] || 'bg-secondary';
  }
}
