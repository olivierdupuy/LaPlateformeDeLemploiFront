import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  NgZone,
  ChangeDetectionStrategy,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { SignalRService } from '../../services/signalr.service';
import { AdminService } from '../../services/admin.service';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

/**
 * Barre d'état du panneau d'administration.
 *
 * Elle répond en permanence à trois questions qu'un exploitant se pose
 * sans vouloir naviguer pour cela : le temps réel fonctionne-t-il, y a-t-il
 * quelqu'un en ligne, et reste-t-il quelque chose à traiter.
 *
 * Tout l'état est en signals et la vue est en OnPush : rien ne se
 * recalcule tant qu'une de ces valeurs n'a pas bougé.
 */

const LABELS: Record<string, string> = {
  offline: 'Hors ligne',
  connecting: 'Connexion…',
  online: 'Temps réel actif',
  reconnecting: 'Reconnexion…',
};

@Component({
  selector: 'app-admin-statusbar',
  imports: [RouterLink],
  templateUrl: './admin-statusbar.html',
  styleUrl: './admin-statusbar.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminStatusbar implements OnInit, OnDestroy {
  private zone = inject(NgZone);
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  hub = inject(SignalRService);

  private subs: Subscription[] = [];
  private timer: ReturnType<typeof setInterval> | null = null;

  now = signal(Date.now());
  onlineUsers = signal(0);
  pendingOffers = signal(0);

  apiHost = new URL(environment.apiUrl).host;
  environmentLabel = environment.production ? 'production' : 'développement';

  stateLabel = computed(() => LABELS[this.hub.state()] ?? this.hub.state());

  /** « il y a 12 s » : la fraîcheur compte plus que l'horodatage exact. */
  sinceLastEvent = computed(() => {
    const last = this.hub.lastEventAt();
    if (!last) return null;
    const seconds = Math.max(0, Math.round((this.now() - last) / 1000));
    if (seconds < 60) return `${seconds} s`;
    const minutes = Math.round(seconds / 60);
    return minutes < 60 ? `${minutes} min` : `${Math.round(minutes / 60)} h`;
  });

  clock = computed(() =>
    new Date(this.now()).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }),
  );

  ngOnInit() {
    this.refreshPresence();
    this.refreshQueue();

    // La présence bouge en direct : on ajuste le compteur sur l'événement
    // plutôt que de redemander la liste au serveur.
    this.subs.push(
      this.hub.userOnline$.subscribe(() => this.onlineUsers.update((n) => n + 1)),
      this.hub.userOffline$.subscribe(() => this.onlineUsers.update((n) => Math.max(0, n - 1))),
      this.hub.newApplication$.subscribe(() => this.refreshQueue()),
    );

    // L'horloge tourne hors de la zone Angular : laissée dedans, chaque
    // battement de seconde déclencherait une détection de changement sur
    // l'application entière. Écrire dans un signal suffit à rafraîchir la
    // barre — et elle seule.
    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.now.set(Date.now()), 1000);
    });
  }

  ngOnDestroy() {
    this.subs.forEach((s) => s.unsubscribe());
    if (this.timer) clearInterval(this.timer);
  }

  private refreshPresence() {
    this.auth.getAllUsers().subscribe({
      next: (users) => this.onlineUsers.set(users.filter((u) => u.isOnline).length),
      error: () => this.onlineUsers.set(0),
    });
  }

  private refreshQueue() {
    this.admin.getModerationQueue('Pending').subscribe({
      next: (offers) => this.pendingOffers.set(offers.length),
      error: () => this.pendingOffers.set(0),
    });
  }
}
