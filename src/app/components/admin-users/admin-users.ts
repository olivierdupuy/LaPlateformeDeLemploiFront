import { Component, OnInit, OnDestroy, inject, computed, signal, effect, NgZone } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { AdminService } from '../../services/admin.service';
import { SignalRService } from '../../services/signalr.service';
import { ToastrService } from 'ngx-toastr';
import { companyColor } from '../../utils/job.utils';
import { dayLabel } from '../../utils/day-filter';
import { pagedQuery } from '../../utils/paged-query';
import { Pager } from '../pager/pager';

const FILTER_LABELS: Record<string, string> = {
  role: 'Rôle',
  jour: 'Inscrit le',
  q: 'Recherche',
};

const ROLE_LABELS: Record<string, string> = {
  Admin: 'Administrateur',
  Recruiter: 'Recruteur',
  Candidate: 'Candidat',
};

interface UserRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  company?: string;
  createdAt: string;
  isActive: boolean;
  isOnline?: boolean;
}

interface UserFacets {
  total: number;
  admins: number;
  recruiters: number;
  candidates: number;
  suspended: number;
  online: number;
}

@Component({
  selector: 'app-admin-users',
  imports: [DatePipe, RouterLink, FormsModule, Pager],
  templateUrl: './admin-users.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsers implements OnInit, OnDestroy {
  private auth = inject(AuthService);
  private admin = inject(AdminService);
  private toastr = inject(ToastrService);
  private signalR = inject(SignalRService);
  private subs: Subscription[] = [];

  companyColor = companyColor;
  roleLabel = (r: string) => ROLE_LABELS[r] ?? r;

  private zone = inject(NgZone);
  private timer: ReturnType<typeof setInterval> | null = null;

  /**
   * La présence arrive par le hub, hors du cycle de la requête paginée :
   * la page servie est un instantané, cette table la corrige en direct
   * sans redemander la liste au serveur à chaque connexion.
   */
  private presence = signal<Record<string, boolean>>({});

  /**
   * Écart accumulé depuis le dernier instantané du serveur. Les facettes
   * donnent le nombre de connectés à l'instant de la réponse ; les
   * événements du hub le font vivre ensuite.
   */
  private onlineDelta = signal(0);

  /** Dernier changement de présence observé, pour dater la fraîcheur. */
  lastChangeAt = signal<number | null>(null);
  now = signal(Date.now());

  /** Lignes dont la présence vient de changer : elles clignotent une fois. */
  justChanged = signal<Record<string, boolean>>({});

  onlineCount = computed(() => Math.max(0, this.q.facets().online + this.onlineDelta()));

  /** État du tuyau : la vue doit dire si la présence affichée est fiable. */
  hubState = this.signalR.state;
  hubOnline = computed(() => this.signalR.state() === 'online');

  /** « il y a 12 s » : ce qui compte est la fraîcheur, pas l'horodatage. */
  sinceLastChange = computed(() => {
    const last = this.lastChangeAt();
    if (!last) return null;
    const seconds = Math.max(0, Math.round((this.now() - last) / 1000));
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
  });

  constructor() {
    // Chaque réponse du serveur réétalonne le compteur : l'écart accumulé
    // depuis la précédente n'a plus lieu d'être.
    effect(() => {
      this.q.facets();
      this.onlineDelta.set(0);
    });
  }

  q = pagedQuery<UserRow, UserFacets>({
    fetch: (p) => this.admin.listUsers(p),
    emptyFacets: { total: 0, admins: 0, recruiters: 0, candidates: 0, suspended: 0, online: 0 },
    toApi: (u) => ({
      q: u['q'] ?? '',
      role: u['role'] ?? '',
      day: u['jour'] ?? '',
      sort: u['tri'] ?? '',
      page: u['page'] ?? '',
      pageSize: u['taille'] ?? '',
    }),
  });

  isOnline = (u: UserRow) => this.presence()[u.id] ?? u.isOnline ?? false;

  activeFilters = computed(() =>
    Object.entries(this.q.params())
      .filter(([k, v]) => FILTER_LABELS[k] && v)
      .map(([key, value]) => ({
        key,
        label: FILTER_LABELS[key],
        value:
          key === 'role' ? this.roleLabel(String(value))
          : key === 'jour' ? dayLabel(String(value))
          : String(value),
      })),
  );

  get search(): string {
    return this.q.params()['q'] ?? '';
  }
  set search(value: string) {
    this.q.onSearch(value);
  }

  ngOnInit() {
    // Les abonnements ne se prennent qu'une fois : les rejouer a chaque
    // rechargement de la liste empilerait un abonne de plus par action.
    this.subs.push(
      this.signalR.userOnline$.subscribe((id) => this.setPresence(id, true)),
      this.signalR.userOffline$.subscribe((id) => this.setPresence(id, false)),
      // Une inscription change la liste elle-même : là, redemander la
      // page est justifié, une correction locale ne suffirait pas.
      this.signalR.newNotification$.subscribe(() => this.q.refresh()),
    );

    // L'horloge du libellé « il y a … » tourne hors zone Angular. Laissée
    // dedans, chaque seconde déclencherait une détection de changement sur
    // toute l'application ; écrire dans un signal suffit à rafraîchir la
    // seule vue qui le lit.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.now.set(Date.now()), 1000);
    });
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.timer) clearInterval(this.timer);
  }

  private setPresence(userId: string, online: boolean) {
    const known = this.presence()[userId];
    // Un même événement peut arriver deux fois (plusieurs onglets ouverts
    // par la même personne) : sans ce garde-fou le compteur dériverait.
    if (known === online) return;

    this.presence.update((map) => ({ ...map, [userId]: online }));
    this.onlineDelta.update((n) => n + (online ? 1 : -1));
    this.lastChangeAt.set(Date.now());

    // La ligne concernée signale son changement, puis redevient normale.
    this.justChanged.update((m) => ({ ...m, [userId]: true }));
    setTimeout(() => this.justChanged.update((m) => ({ ...m, [userId]: false })), 2000);
  }

  /** Redemande la page courante après une action qui change les données. */
  private reload() {
    this.q.refresh();
  }

  toggleActive(user: UserRow) {
    this.auth.toggleUserActive(user.id).subscribe({
      next: () => { this.toastr.success('Statut modifié'); this.reload(); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  changeRole(user: UserRow, role: string) {
    this.auth.changeUserRole(user.id, role).subscribe({
      next: () => { this.toastr.success('Rôle modifié'); this.reload(); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  getRoleBadge(role: string): string {
    return { Admin: 'badge-red', Recruiter: 'badge-indigo', Candidate: 'badge-green' }[role] || 'badge-yellow';
  }
}
