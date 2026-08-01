import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-site-banner',
  standalone: true,
  template: `
    @for (b of banners(); track b.id) {
      <div class="site-banner" [class]="'banner-' + b.type" role="status">
        <div class="banner-content">
          <i class="bi" [class]="iconFor(b.type)" aria-hidden="true"></i>
          <p><strong>{{ b.title }}</strong> {{ b.message }}</p>
        </div>
        <button class="banner-close" (click)="dismiss(b.id)" aria-label="Masquer ce message">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </div>
    }
  `,
  styles: [`
    /* Bandeau d'information — au-dessus de la navbar prune,
       assez sobre pour ne pas concurrencer la marque. */
    .site-banner {
      display: flex; align-items: center; justify-content: space-between;
      gap: 1rem;
      padding: 0.62rem clamp(1.1rem, 4vw, 2.25rem);
      font-size: 0.83rem; line-height: 1.45;
      border-bottom: 1px solid rgba(12, 27, 51, 0.08);
    }
    .banner-content { display: flex; align-items: center; gap: 0.55rem; flex: 1; min-width: 0; }
    .banner-content i { font-size: 0.95rem; flex-shrink: 0; }
    .banner-content strong { font-weight: 700; margin-right: 0.3rem; }
    .banner-close {
      display: inline-flex; align-items: center; justify-content: center;
      width: 28px; height: 28px; flex-shrink: 0;
      border-radius: var(--r-xs); font-size: 0.78rem;
      color: inherit; opacity: 0.6;
      transition: opacity 0.18s, background 0.18s;
    }
    .banner-close:hover { opacity: 1; background: rgba(12, 27, 51, 0.08); }

    /* Les quatre natures, sur la gamme de la charte.
       Les alias hérités (--blue-bg, --green-bg, --purple-bg) pointent tous
       vers le même aplat depuis le passage au bleu : « info » et « succès »
       s'affichaient à l'identique, et les encres restées de l'ancienne
       charte — un vert, un brun — juraient sur un fond bleu.
       Fonds et encres viennent désormais du même endroit. */
    .banner-info    { background: var(--bleu-100);   color: #123c44; }
    .banner-warning { background: var(--rouge-100);  color: #6b4a00; }
    .banner-success { background: var(--nuage-2);    color: #1d5c3a; border-bottom-color: rgba(29, 92, 58, 0.18); }
    .banner-danger  { background: var(--danger-100); color: #8a2a22; }
  `],
})
export class SiteBanner implements OnInit {
  private admin = inject(AdminService);
  banners = signal<any[]>([]);
  private dismissed = new Set<number>();

  ngOnInit() {
    this.admin.getActiveBanners().subscribe(b => this.banners.set(b));
  }

  dismiss(id: number) {
    this.dismissed.add(id);
    this.banners.update(list => list.filter(b => !this.dismissed.has(b.id)));
  }

  iconFor(type: string): string {
    return { info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill', success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill' }[type] || 'bi-info-circle-fill';
  }
}
