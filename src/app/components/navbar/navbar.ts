import { Component, signal, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MessageService } from '../../services/message.service';
import { SignalRService } from '../../services/signalr.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, DatePipe],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit, OnDestroy {
  bookmarkService = inject(BookmarkService);
  auth = inject(AuthService);
  notifService = inject(NotificationService);
  messageService = inject(MessageService);
  private signalR = inject(SignalRService);
  private toastr = inject(ToastrService);
  private router = inject(Router);
  private subs: Subscription[] = [];

  scrolled = signal(false);
  mobileOpen = signal(false);
  notifOpen = signal(false);
  userMenuOpen = signal(false);

  @HostListener('window:scroll')
  onScroll() { this.scrolled.set(window.scrollY > 20); }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const t = e.target as HTMLElement;
    if (!t.closest('.notif-wrap')) this.notifOpen.set(false);
    if (!t.closest('.user-menu-wrap')) this.userMenuOpen.set(false);
  }

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.notifService.startPolling();
      this.messageService.loadUnreadCount();

      // Start SignalR
      const token = localStorage.getItem('lpde_token');
      if (token) this.signalR.start(token);

      // Real-time updates
      this.subs.push(
        this.signalR.unreadCountUpdate$.subscribe(() => this.messageService.loadUnreadCount()),
        this.signalR.newNotification$.subscribe(() => { this.notifService.loadAll(); this.messageService.loadUnreadCount(); }),
        this.signalR.newApplication$.subscribe((data) => {
          this.toastr.info(`${data.candidateName} a postule a "${data.jobTitle}"`, 'Nouvelle candidature');
        }),
        this.signalR.applicationStatusChanged$.subscribe((data) => {
          const labels: Record<string, string> = { Pending: 'en attente', Reviewed: 'examinee', Accepted: 'acceptee', Rejected: 'refusee' };
          this.toastr.info(`Votre candidature pour "${data.jobTitle}" est ${labels[data.status] || data.status}`, 'Statut modifie');
        })
      );
    }
  }

  ngOnDestroy() {
    this.notifService.stopPolling();
    this.signalR.stop();
    this.subs.forEach(s => s.unsubscribe());
  }

  toggleMobile() { this.mobileOpen.update((v) => !v); }

  toggleNotif(e: Event) {
    e.stopPropagation();
    this.userMenuOpen.set(false);
    this.notifOpen.update((v) => !v);
    if (this.notifOpen()) this.notifService.loadAll();
  }

  toggleUserMenu(e: Event) {
    e.stopPropagation();
    this.notifOpen.set(false);
    this.userMenuOpen.update((v) => !v);
  }

  onNotifClick(notif: any) {
    if (!notif.isRead) this.notifService.markAsRead(notif.id).subscribe();
    this.notifOpen.set(false);
    if (notif.link) this.router.navigate([notif.link]);
  }

  markAllRead() { this.notifService.markAllAsRead().subscribe(); }

  getNotifIcon(type: string): string {
    return { NouveauCandidat: 'bi-person-plus-fill', StatutModifie: 'bi-arrow-repeat', OffreExpiree: 'bi-clock-history' }[type] || 'bi-bell';
  }

  getRoleLabel(): string {
    return { Admin: 'Administrateur', Recruiter: 'Recruteur', Candidate: 'Candidat' }[this.auth.currentUser()?.role || ''] || '';
  }

  navigateAndClose(path: string) {
    this.userMenuOpen.set(false);
    this.mobileOpen.set(false);
    this.router.navigate([path]);
  }

  logout() {
    this.userMenuOpen.set(false);
    this.mobileOpen.set(false);
    this.auth.logout();
  }
}
