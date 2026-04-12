import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-announcements',
  imports: [DatePipe, FormsModule],
  templateUrl: './admin-announcements.html',
  styleUrl: './admin-announcements.scss',
})
export class AdminAnnouncements implements OnInit {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  announcements = signal<any[]>([]);
  loading = signal(true);
  showForm = signal(false);

  form = { title: '', message: '', type: 'info', targetRole: '', isBanner: false, startsAt: '', endsAt: '' };

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.admin.getAnnouncements().subscribe(a => { this.announcements.set(a); this.loading.set(false); });
  }

  create() {
    if (!this.form.title || !this.form.message) return;
    this.admin.createAnnouncement({
      ...this.form,
      targetRole: this.form.targetRole || null,
      startsAt: this.form.startsAt || null,
      endsAt: this.form.endsAt || null,
    }).subscribe(() => {
      this.toastr.success('Annonce creee');
      this.showForm.set(false);
      this.form = { title: '', message: '', type: 'info', targetRole: '', isBanner: false, startsAt: '', endsAt: '' };
      this.load();
    });
  }

  toggle(id: number) {
    this.admin.toggleAnnouncement(id).subscribe(() => { this.toastr.success('Statut modifie'); this.load(); });
  }

  remove(id: number) {
    this.admin.deleteAnnouncement(id).subscribe(() => { this.toastr.success('Annonce supprimee'); this.load(); });
  }

  typeIcon(type: string): string {
    return { info: 'bi-info-circle-fill', warning: 'bi-exclamation-triangle-fill', success: 'bi-check-circle-fill', danger: 'bi-x-octagon-fill' }[type] || 'bi-info-circle-fill';
  }

  typeColor(type: string): string {
    return { info: 'var(--blue, #2563eb)', warning: 'var(--amber)', success: 'var(--green)', danger: 'var(--red)' }[type] || 'var(--blue, #2563eb)';
  }

  // Export
  exportUsers() { this.download(this.admin.exportUsers(), 'utilisateurs'); }
  exportOffers() { this.download(this.admin.exportOffers(), 'offres'); }
  exportApps() { this.download(this.admin.exportApplications(), 'candidatures'); }

  private download(obs: any, name: string) {
    obs.subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name}_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      this.toastr.success(`Export ${name} telecharge`);
    });
  }
}
