import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth.service';
import { NotificationService, AppNotification } from '../../services/notification.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css'
})
export class Navbar implements OnInit {
  notifications: AppNotification[] = [];
  unreadCount = 0;
  darkMode = false;
  searchQuery = '';
  showSearch = false;
  suggestions: { title: string; id: number; companyName: string }[] = [];
  showSuggestions = false;
  searchHistory: string[] = [];

  constructor(
    public authService: AuthService,
    public notifService: NotificationService,
    private router: Router,
    private toastr: ToastrService,
    private cdr: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.darkMode = localStorage.getItem('theme') === 'dark';
    this.applyTheme();

    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.loadNotifications();
        this.notifService.startPolling();
      }
    });

    this.notifService.unreadCount$.subscribe(c => {
      this.unreadCount = c;
      this.cdr.detectChanges();
    });
  }

  loadNotifications(): void {
    this.notifService.getAll().subscribe(n => {
      this.notifications = n.slice(0, 10);
      this.notifService.refreshUnreadCount();
      this.cdr.detectChanges();
    });
  }

  markAsRead(notif: AppNotification): void {
    if (!notif.isRead) {
      this.notifService.markAsRead(notif.id).subscribe();
      notif.isRead = true;
    }
    if (notif.link) this.router.navigate([notif.link]);
  }

  markAllAsRead(): void {
    this.notifService.markAllAsRead().subscribe(() => {
      this.notifications.forEach(n => n.isRead = true);
      this.cdr.detectChanges();
    });
  }

  logout(): void {
    this.authService.logout();
    this.toastr.success('Deconnexion reussie');
    this.router.navigate(['/']);
  }

  toggleTheme(): void {
    this.darkMode = !this.darkMode;
    localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
    this.applyTheme();
  }

  private applyTheme(): void {
    document.documentElement.setAttribute('data-theme', this.darkMode ? 'dark' : 'light');
  }

  quickSearch(): void {
    if (this.searchQuery.trim()) {
      this.saveSearchHistory(this.searchQuery.trim());
      this.router.navigate(['/offres'], { queryParams: { search: this.searchQuery.trim() } });
      this.searchQuery = '';
      this.showSearch = false;
      this.showSuggestions = false;
    }
  }

  onSearchInput(): void {
    if (this.searchQuery.trim().length < 2) {
      this.suggestions = [];
      this.showSuggestions = false;
      return;
    }
    this.http.get<any>('/api/joboffers', { params: { search: this.searchQuery.trim(), pageSize: '5' } }).subscribe({
      next: (result) => {
        this.suggestions = (result.items || []).map((j: any) => ({ title: j.title, id: j.id, companyName: j.companyName }));
        this.showSuggestions = this.suggestions.length > 0;
        this.cdr.detectChanges();
      }
    });
  }

  selectSuggestion(s: { title: string; id: number }): void {
    this.saveSearchHistory(s.title);
    this.router.navigate(['/offres', s.id]);
    this.searchQuery = '';
    this.showSearch = false;
    this.showSuggestions = false;
  }

  private saveSearchHistory(term: string): void {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]') as string[];
    const filtered = history.filter(h => h !== term);
    filtered.unshift(term);
    localStorage.setItem('searchHistory', JSON.stringify(filtered.slice(0, 5)));
    this.searchHistory = filtered.slice(0, 5);
  }

  loadSearchHistory(): void {
    this.searchHistory = JSON.parse(localStorage.getItem('searchHistory') || '[]');
  }

  onSearchKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') this.quickSearch();
    if (event.key === 'Escape') { this.showSearch = false; this.searchQuery = ''; }
  }

  timeAgo(date: string): string {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "A l'instant";
    if (mins < 60) return `Il y a ${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `Il y a ${hrs}h`;
    return `Il y a ${Math.floor(hrs / 24)}j`;
  }
}
