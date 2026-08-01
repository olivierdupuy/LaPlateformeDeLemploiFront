import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  signal,
  computed,
  NgZone,
  ChangeDetectionStrategy, effect } from '@angular/core';
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
  /**
   * Le compte vient du service, qui tient l'ensemble des personnes
   * connectées. Cette barre entretenait son propre compteur en
   * l'incrémentant à chaque `UserOnline` reçu — sans regarder de qui il
   * s'agissait. Trois onglets d'une même personne le faisaient monter de
   * trois et n'en rendaient qu'un à son départ : la barre a été mesurée à
   * quatre alors qu'une seule personne était connectée.
   */
  onlineUsers = this.hub.onlineCount;
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
    this.refreshQueue();

    this.subs.push(this.hub.newApplication$.subscribe(() => this.refreshQueue()));

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

  /**
   * Le hub n'annonce que les changements : à l'ouverture de la page, il
   * ne dit rien de ceux qui étaient déjà là. L'état de départ vient donc
   * de l'API, et alimente le service — pas un compteur local.
   *
   * L'amorçage suit la connexion au lieu de la précéder. Lancé depuis
   * `ngOnInit`, il partait avant que le hub ne soit ouvert : le serveur ne
   * voyait pas encore cet onglet, et comme le hub n'annonce jamais votre
   * propre arrivée — `Clients.Others` vous exclut — on ne se comptait
   * jamais soi-même. La barre affichait une personne de moins qu'il n'y
   * en avait, indéfiniment.
   *
   * Le même effet couvre la reconnexion : les événements émis pendant la
   * coupure sont perdus, l'ensemble retenu doit être redemandé.
   */
  private amorcage = effect(() => {
    if (this.hub.state() !== 'online') return;
    this.refreshPresence();
  });

  private refreshPresence() {
    this.auth.getAllUsers().subscribe({
      next: (users) => this.hub.seedPresence(users.filter((u) => u.isOnline).map((u) => u.id)),
      error: () => {},
    });
  }

  private refreshQueue() {
    this.admin.getModerationQueue('Pending').subscribe({
      next: (offers) => this.pendingOffers.set(offers.length),
      error: () => this.pendingOffers.set(0),
    });
  }
}
