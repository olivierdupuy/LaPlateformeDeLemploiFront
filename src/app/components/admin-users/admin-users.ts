import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { UserDto } from '../../models/auth.model';
import { ToastrService } from 'ngx-toastr';
import { companyColor } from '../../utils/job.utils';

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit {
  private auth = inject(AuthService);
  private toastr = inject(ToastrService);

  users = signal<UserDto[]>([]);
  loading = signal(true);
  companyColor = companyColor;

  ngOnInit() {
    this.auth.getAllUsers().subscribe({
      next: (u) => { this.users.set(u); this.loading.set(false); },
      error: () => { this.toastr.error('Acces refuse'); this.loading.set(false); },
    });
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
