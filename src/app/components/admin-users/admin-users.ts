import { Component, OnInit, OnDestroy, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { SignalRService } from '../../services/signalr.service';
import { UserDto } from '../../models/auth.model';
import { ToastrService } from 'ngx-toastr';
import { companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);
  private signalR = inject(SignalRService);
  private subs: Subscription[] = [];

  users = signal<UserDto[]>([]);
  loading = signal(true);
  companyColor = companyColor;

  onlineCount = computed(() => this.users().filter(u => u.isOnline).length);

  ngOnInit() {
    this.auth.getAllUsers().subscribe({
      next: (u) => { this.users.set(u); this.loading.set(false); },
      error: () => { this.toastr.error('Acces refuse'); this.loading.set(false); },
    });

    this.subs.push(
      this.signalR.userOnline$.subscribe(userId => this.setUserOnline(userId, true)),
      this.signalR.userOffline$.subscribe(userId => this.setUserOnline(userId, false)),
    );
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  private setUserOnline(userId: string, online: boolean) {
    this.users.update(list =>
      list.map(u => u.id === userId ? { ...u, isOnline: online } : u)
    );
  }

  toggleActive(user: UserDto) {
    this.auth.toggleUserActive(user.id).subscribe({
      next: () => { this.toastr.success('Statut modifie'); this.ngOnInit(); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  changeRole(user: UserDto, role: string) {
    this.auth.changeUserRole(user.id, role).subscribe({
      next: () => { this.toastr.success('Role modifie'); this.ngOnInit(); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  getRoleBadge(role: string): string {
    return { Admin: 'badge-red', Recruiter: 'badge-indigo', Candidate: 'badge-green' }[role] || 'badge-yellow';
  }
}
