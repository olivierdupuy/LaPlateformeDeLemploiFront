import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import {
  AdminPlateformeService, CleApiAdmin, WebhookAdmin, LivraisonWebhook,
  DiffusionAdmin, DestinationEnPeine,
} from '../../services/admin-plateforme.service';

/**
 * Les accès techniques, vus de la plateforme entière.
 *
 * Les clés d'API et les webhooks sont en self-service : chaque recruteur
 * crée les siens depuis sa page de facturation. Le serveur répondait bien
 * à un administrateur — mais sur son propre compte. La conséquence
 * n'était pas théorique : une clé qui fuit ne pouvait être révoquée que
 * par la personne qui l'avait créée, et si elle ne répondait pas, il n'y
 * avait aucun geste possible.
 *
 * Cette page ne crée rien. On ne fabrique pas une clé à la place de
 * quelqu'un. Elle montre, elle révoque, et elle trace.
 */
type Onglet = 'cles' | 'webhooks' | 'diffusions';

@Component({
  selector: 'app-admin-integrations',
  imports: [DatePipe],
  templateUrl: './admin-integrations.html',
  styleUrl: './admin-integrations.scss',
})
export class AdminIntegrations implements OnInit {
  private api = inject(AdminPlateformeService);
  private toastr = inject(ToastrService);

  onglet = signal<Onglet>('cles');
  chargement = signal(true);

  cles = signal<CleApiAdmin[]>([]);
  clesActives = signal(0);
  clesDormantes = signal(0);
  clesRevoquees = signal(0);

  webhooks = signal<WebhookAdmin[]>([]);
  webhooksActifs = signal(0);
  webhooksTombes = signal(0);

  /** Les livraisons du webhook déplié, par identifiant. */
  livraisons = signal<Map<number, LivraisonWebhook[]>>(new Map());
  deplie = signal<number | null>(null);

  diffusions = signal<DiffusionAdmin[]>([]);
  parDestination = signal<DestinationEnPeine[]>([]);

  /** Ce qui demande une décision : clés dormantes, webhooks tombés, diffusions en échec. */
  aTraiter = computed(() =>
    this.clesDormantes() + this.webhooksTombes()
    + this.parDestination().reduce((n, d) => n + d.enEchec, 0));

  ngOnInit() { this.charger(); }

  private charger() {
    this.chargement.set(true);

    this.api.cles().subscribe({
      next: (r) => {
        this.cles.set(r.cles);
        this.clesActives.set(r.actives);
        this.clesDormantes.set(r.dormantes);
        this.clesRevoquees.set(r.revoquees);
        this.chargement.set(false);
      },
      error: () => { this.chargement.set(false); this.toastr.error('Les clés n’ont pas pu être chargées.'); },
    });

    this.api.webhooks().subscribe({
      next: (r) => {
        this.webhooks.set(r.webhooks);
        this.webhooksActifs.set(r.actifs);
        this.webhooksTombes.set(r.tombes);
      },
      error: () => this.webhooks.set([]),
    });

    this.api.diffusions().subscribe({
      next: (r) => { this.diffusions.set(r.lignes); this.parDestination.set(r.parDestination); },
      error: () => { this.diffusions.set([]); this.parDestination.set([]); },
    });
  }

  rafraichir() { this.charger(); }

  // ══════════════════════════════
  //  Les clés
  // ══════════════════════════════

  /**
   * Révoquer.
   *
   * La confirmation récite ce qui va se produire plutôt que de demander
   * « êtes-vous sûr » : le porteur perdra l'accès sans préavis, et son
   * intégration s'arrêtera à l'appel suivant. C'est parfois exactement ce
   * qu'on veut — encore faut-il le savoir.
   */
  async revoquer(c: CleApiAdmin) {
    const r = await Swal.fire({
      title: 'Révoquer cette clé ?',
      html: `<p style="font-size:.92rem;line-height:1.6;text-align:left">
               <b>${AdminIntegrations.echapper(c.nom)}</b> (${AdminIntegrations.echapper(c.prefixe)}…),
               portée par ${AdminIntegrations.echapper(c.proprietaire)}.
             </p>
             <p style="font-size:.9rem;line-height:1.6;text-align:left;color:#577177;margin-top:.7rem">
               L'intégration qui s'en sert s'arrêtera au prochain appel, sans préavis.
               La clé reste dans les journaux : elle est marquée révoquée, jamais supprimée.
             </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Révoquer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.api.revoquerCle(c.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.charger(); },
      error: () => this.toastr.error('La révocation a échoué.'),
    });
  }

  // ══════════════════════════════
  //  Les webhooks
  // ══════════════════════════════

  basculerLivraisons(w: WebhookAdmin) {
    if (this.deplie() === w.id) { this.deplie.set(null); return; }
    this.deplie.set(w.id);

    if (this.livraisons().has(w.id)) return;
    this.api.livraisons(w.id).subscribe({
      next: (l) => this.livraisons.update((m) => new Map(m).set(w.id, l)),
      error: () => this.livraisons.update((m) => new Map(m).set(w.id, [])),
    });
  }

  livraisonsDe = (id: number) => this.livraisons().get(id) ?? [];

  /**
   * Remettre en service un abonnement tombé.
   *
   * Le porteur ne peut rien faire : le compteur d'échecs ne se remet à
   * zéro qu'à une livraison réussie, et plus aucune livraison ne part
   * puisque l'abonnement est éteint. Sans ce geste, la seule issue est
   * d'en créer un autre — et de perdre l'historique de celui-ci.
   */
  reactiver(w: WebhookAdmin) {
    this.api.reactiverWebhook(w.id).subscribe({
      next: (x) => { this.toastr.success(x.message); this.charger(); },
      error: () => this.toastr.error('La remise en service a échoué.'),
    });
  }

  /** Une URL longue tient rarement dans une ligne : on la coupe au milieu. */
  urlCourte(u: string): string {
    if (u.length <= 52) return u;
    return u.slice(0, 30) + '…' + u.slice(-18);
  }

  /**
   * Neutralise ce qui vient d'ailleurs avant de le coudre dans du HTML.
   *
   * Les gabarits Angular échappent seuls ; les boîtes de dialogue, non —
   * leur contenu est posé tel quel dans le document. Or le nom d'une clé
   * et l'URL d'un webhook sont saisis par un recruteur.
   */
  private static echapper(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
