import { Component, OnInit, inject, signal } from '@angular/core';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-site-banner',
  standalone: true,
  template: `
    @for (b of banners(); track b.id) {
      <div class="site-banner" [class]="'banner-' + b.type">
        <div class="banner-content">
          <i class="bi" [class]="iconFor(b.type)"></i>
          <div><strong>{{ b.title }}</strong> {{ b.message }}</div>
        </div>
        <button class="banner-close" (click)="dismiss(b.id)"><i class="bi bi-x-lg"></i></button>
      </div>
    }
  `,
  styles: [`
    .site-banner { display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 1.5rem; font-size: 0.82rem; font-weight: 500; gap: 1rem; }
    .banner-content { display: flex; align-items: center; gap: 0.5rem; flex: 1; strong { margin-right: 0.3rem; } }
    .banner-close { background: none; border: none; cursor: pointer; font-size: 0.85rem; opacity: 0.7; color: inherit; &:hover { opacity: 1; } }
    .banner-info { background: #dbeafe; color: #1e40af; }
    .banner-warning { background: #fef3c7; color: #92400e; }
    .banner-success { background: #dcfce7; color: #166534; }
    .banner-danger { background: #fee2e2; color: #991b1b; }
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
