import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../services/admin.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-admin-moderation',
  imports: [DatePipe, SlicePipe, FormsModule],
  templateUrl: './admin-moderation.html',
  styleUrl: './admin-moderation.scss',
})
export class AdminModeration implements OnInit {
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);

  offers = signal<any[]>([]);
  loading = signal(true);
  activeTab = signal<string>('Pending');
  rejectNote = '';
  rejectingId = signal<number | null>(null);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.admin.getModerationQueue(this.activeTab()).subscribe(o => {
      this.offers.set(o);
      this.loading.set(false);
    });
  }

  switchTab(tab: string) { this.activeTab.set(tab); this.load(); }

  approve(id: number) {
    this.admin.approveOffer(id).subscribe(() => {
      this.toastr.success('Offre approuvee');
      this.load();
    });
  }

  startReject(id: number) { this.rejectingId.set(id); this.rejectNote = ''; }
  cancelReject() { this.rejectingId.set(null); }

  confirmReject(id: number) {
    this.admin.rejectOffer(id, this.rejectNote).subscribe(() => {
      this.toastr.success('Offre rejetee');
      this.rejectingId.set(null);
      this.load();
    });
  }

  moderationLabel(status: string): string {
    return { Pending: 'En attente', Approved: 'Approuvee', Rejected: 'Rejetee' }[status] || status;
  }

  toggleFeature(id: number) {
    this.admin.toggleFeature(id).subscribe((res) => {
      this.toastr.success(res.isFeatured ? 'Mise en avant' : 'Retiree de la une');
      this.load();
    });
  }
}
