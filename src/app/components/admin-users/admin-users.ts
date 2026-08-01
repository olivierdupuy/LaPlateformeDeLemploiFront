import { Component, OnInit, OnDestroy, inject, computed, signal, effect, NgZone } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
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

  /** Ce qui protège le compte, servi avec la liste : voir un administrateur
   *  sans second facteur ne doit pas obliger à ouvrir sa fiche. */
  twoFactorEnabled?: boolean;
  emailConfirmed?: boolean;
  /** Enfermé dehors par le compteur d'échecs de connexion. */
  verrouille?: boolean;
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
  imports: [DecimalPipe, DatePipe, RouterLink, FormsModule, Pager],
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
   * La présence n'est plus tenue ici.
   *
   * Cette table et la barre d'état suivaient les mêmes événements chacune
   * de son côté, avec deux implémentations dont une seule était juste.
   * Elle vit désormais dans le service, qui en garde l'ensemble des
   * identifiants — un doublon n'y change rien.
   *
   * L'amorçage est fait par la barre d'état, montée en permanence dans le
   * gabarit d'administration : le hub n'annonce que les changements et ne
   * dit jamais qui était déjà là.
   */

  /** Dernier changement de présence observé, pour dater la fraîcheur. */
  lastChangeAt = signal<number | null>(null);
  now = signal(Date.now());

  /** Lignes dont la présence vient de changer : elles clignotent une fois. */
  justChanged = signal<Record<string, boolean>>({});

  onlineCount = this.signalR.onlineCount;

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

  /**
   * Le hub fait foi dès qu'il a parlé. Tant qu'il n'a rien dit — page
   * ouverte avant l'amorçage — on s'en tient à l'instantané du serveur.
   */
  isOnline = (u: UserRow) =>
    this.signalR.onlineCount() > 0 ? this.signalR.onlineUserIds().has(u.id) : (u.isOnline ?? false);

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
      // La présence elle-même est tenue par le service ; il ne reste ici
      // qu'à dater le dernier changement et à faire clignoter la ligne.
      this.signalR.userOnline$.subscribe((id) => this.signalerChangement(id)),
      this.signalR.userOffline$.subscribe((id) => this.signalerChangement(id)),
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

  /** Date le dernier mouvement et fait clignoter la ligne concernée. */
  private signalerChangement(userId: string) {
    this.lastChangeAt.set(Date.now());
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

  /**
   * Pastille de role.
   *
   * L'administrateur portait `badge-red`, c'est-a-dire le rouge de danger
   * — la couleur reservee a ce qui supprime ou echoue. Sur la meme ligne,
   * « Suspendu » porte ce meme rouge : deux informations de nature
   * differente, un role et un etat, peintes a l'identique.
   *
   * Les trois roles suivent donc l'echelle de remplissage de la palette,
   * du contour au bleu plein a mesure que le privilege monte, et le rouge
   * redevient ce qu'il est : la couleur de « Suspendu », et rien d'autre.
   */
  getRoleBadge(role: string): string {
    return {
      Admin: 'badge-plum',       // bleu profond plein — le plus de droits
      Recruiter: 'badge-blue',   // aplat clair
      Candidate: 'badge-yellow', // contour seul — le plus nombreux
    }[role] || 'badge-yellow';
  }
}
