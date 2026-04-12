import { Component, signal, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { MessageService } from '../../services/message.service';

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
  private router = inject(Router);

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
    }
  }

  ngOnDestroy() { this.notifService.stopPolling(); }

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
