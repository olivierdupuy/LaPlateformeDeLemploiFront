import { Component, signal, inject, OnInit, OnDestroy, HostListener } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BookmarkService } from '../../services/bookmark.service';
import { AuthService } from '../../services/auth.service';
import { AuthModalService } from '../../services/auth-modal.service';
import { NotificationService } from '../../services/notification.service';
import { MessageService } from '../../services/message.service';
import { SignalRService } from '../../services/signalr.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, DatePipe, FormsModule],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss',
})
export class Navbar implements OnInit, OnDestroy {
  bookmarkService = inject(BookmarkService);
  auth = inject(AuthService);
  authModale = inject(AuthModalService);
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

  /** Champ de recherche de la barre, actif une fois la page descendue. */
  quickQuery = '';

  @HostListener('window:scroll')
  onScroll() {
    const compact = window.scrollY > 120;
    this.scrolled.set(compact);
    // La hauteur courante de la barre vit sur <html> : les barres de
    // filtres collantes s'y accrochent (--nav-now), et une variable CSS
    // ne remonte pas jusqu'a la racine depuis le composant.
    document.documentElement.classList.toggle('nav-compact', compact);
  }

  /** Recherche depuis la barre : meme destination que le champ du hero. */
  quickSearch() {
    const q = this.quickQuery.trim();
    this.router.navigate(['/offres'], { queryParams: q ? { search: q } : {} });
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: Event) {
    const t = e.target as HTMLElement;
    if (!t.closest('.notif-wrap')) this.notifOpen.set(false);
    if (!t.closest('.user-menu-wrap')) this.userMenuOpen.set(false);
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    this.notifOpen.set(false);
    this.userMenuOpen.set(false);
    this.closeMobile();
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
          const labels: Record<string, string> = { Pending: 'en attente', Reviewed: 'examinée', Accepted: 'acceptée', Rejected: 'refusée' };
          this.toastr.info(`Votre candidature pour "${data.jobTitle}" est ${labels[data.status] || data.status}`, 'Statut modifie');
        })
      );
    }
  }

  ngOnDestroy() {
    this.notifService.stopPolling();
    // La connexion temps réel n'est pas fermée ici : elle appartient à la
    // session, pas à cette barre. Le panneau d'administration ne rend pas
    // la navbar — la détruire en y entrant coupait le temps réel de toute
    // l'application. La fermeture se fait à la déconnexion.
    this.subs.forEach(s => s.unsubscribe());
    // Le panneau d'administration ne rend pas cette barre : la marque de
    // resserrement doit partir avec elle.
    document.documentElement.classList.remove('nav-compact');
    document.body.classList.remove('nav-locked');
  }

  toggleMobile() {
    this.mobileOpen.update((v) => !v);
    // Le menu mobile occupe l'ecran : la page derriere ne doit pas defiler.
    document.body.classList.toggle('nav-locked', this.mobileOpen());
  }

  closeMobile() {
    this.mobileOpen.set(false);
    document.body.classList.remove('nav-locked');
  }

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
