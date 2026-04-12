import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';

@Component({
  selector: 'app-admin-activity',
  imports: [DatePipe, FormsModule],
  templateUrl: './admin-activity.html',
  styleUrl: './admin-activity.scss',
})
export class AdminActivity implements OnInit {
  private admin = inject(AdminService);

  logs = signal<any[]>([]);
  actions = signal<string[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(true);
  filterAction = '';
  filterEntity = '';
  Math = Math;

  ngOnInit() {
    this.loadLogs();
    this.admin.getLogActions().subscribe(a => this.actions.set(a));
  }

  loadLogs() {
    this.loading.set(true);
    this.admin.getActivityLogs({
      action: this.filterAction || undefined,
      entityType: this.filterEntity || undefined,
      page: this.page(),
    }).subscribe(res => {
      this.logs.set(res.logs);
      this.total.set(res.total);
      this.loading.set(false);
    });
  }

  applyFilter() { this.page.set(1); this.loadLogs(); }
  resetFilters() { this.filterAction = ''; this.filterEntity = ''; this.page.set(1); this.loadLogs(); }
  nextPage() { this.page.update(p => p + 1); this.loadLogs(); }
  prevPage() { if (this.page() > 1) { this.page.update(p => p - 1); this.loadLogs(); } }

  actionIcon(action: string): string {
    const map: Record<string, string> = {
      Login: 'bi-box-arrow-in-right', Register: 'bi-person-plus', ExportCSV: 'bi-download',
      ApproveOffer: 'bi-check-circle', RejectOffer: 'bi-x-circle', ToggleFeature: 'bi-star',
      CreateAnnouncement: 'bi-megaphone', UpdateSettings: 'bi-gear', ChangeRole: 'bi-shield',
    };
    return map[action] || 'bi-activity';
  }

  actionColor(action: string): string {
    const map: Record<string, string> = {
      Login: 'var(--teal)', Register: 'var(--blue, #2563eb)', ExportCSV: 'var(--amber)',
      ApproveOffer: 'var(--green)', RejectOffer: 'var(--red)', ToggleFeature: '#f97316',
      CreateAnnouncement: '#8b5cf6', UpdateSettings: 'var(--navy-700)',
    };
    return map[action] || 'var(--slate-400)';
  }
}
