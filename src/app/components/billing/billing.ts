import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import {
  PlateformeProService,
  Formule,
  MonCompte,
  Facture,
  CleApi,
  WebhookAbonne,
} from '../../services/plateforme-pro.service';
import { SeoService } from '../../services/seo.service';

/**
 * Facturation et intégrations, côté recruteur.
 *
 * La mise en avant d'une offre existait déjà — bouton, étiquette,
 * remontée dans le tri — mais elle était gratuite et sans limite.
 * Autrement dit le seul levier économique du site était offert ; et
 * comme tout le monde pouvait s'en servir, il ne distinguait plus rien :
 * quand toutes les offres sont mises en avant, aucune ne l'est.
 *
 * Cette page réunit ce qui manquait : la formule et ses quotas, les
 * mises en avant restantes, les factures, et — pour la formule Pro — les
 * clés d'API et les webhooks qu'un recruteur équipé vient chercher.
 *
 * Quand aucun prestataire de paiement n'est configuré, l'achat est
 * refusé avec un message clair plutôt que par un bouton qui ne fait
 * rien. Le reste de la page continue de servir.
 */
@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './billing.html',
  styleUrl: './billing.scss',
})
export class Billing implements OnInit {
  private service = inject(PlateformeProService);
  private toast = inject(ToastrService);
  private seo = inject(SeoService);

  readonly compte = signal<MonCompte | null>(null);
  readonly formules = signal<Formule[]>([]);
  readonly factures = signal<Facture[]>([]);
  readonly cles = signal<CleApi[]>([]);
  readonly abonnes = signal<WebhookAbonne[]>([]);
  readonly chargement = signal(true);

  readonly onglet = signal<'formule' | 'factures' | 'api'>('formule');

  /**
   * Une clé ou un secret ne s'affiche qu'une fois, à la création. On le
   * garde ici le temps que la personne le copie — pas au-delà, et
   * jamais en stockage local : ce serait rendre inutile le fait de ne
   * pas l'avoir stocké côté serveur.
   */
  readonly secretAffiche = signal<{ titre: string; valeur: string; note: string } | null>(null);

  readonly estPro = computed(() => this.compte()?.formule.cle === 'pro');

  ngOnInit(): void {
    this.seo.privee('Facturation');
    this.charger();
  }

  private charger(): void {
    this.service.monCompte().subscribe({
      next: (c) => {
        this.compte.set(c);
        this.chargement.set(false);
        if (c.formule.cle === 'pro') this.chargerIntegrations();
      },
      error: () => this.chargement.set(false),
    });

    this.service.formules().subscribe({ next: (f) => this.formules.set(f) });
    this.service.factures().subscribe({ next: (f) => this.factures.set(f) });
  }

  private chargerIntegrations(): void {
    this.service.clesApi().subscribe({ next: (c) => this.cles.set(c) });
    this.service.webhooks().subscribe({ next: (w) => this.abonnes.set(w) });
  }

  euros(centimes: number): string {
    return (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  quotaLisible(quota: number): string {
    return quota < 0 ? 'illimité' : String(quota);
  }

  souscrire(cle: string): void {
    if (cle === this.compte()?.formule.cle) return;

    this.service.souscrire(cle).subscribe({
      next: (r) => {
        if (r.redirection) location.href = r.redirection;
      },
      error: (e) =>
        this.toast.info(
          e?.error?.message ?? "Le paiement en ligne n'est pas encore ouvert.",
          '',
          { timeOut: 8000 },
        ),
    });
  }

  creerCle(): void {
    const nom = prompt('Nom de cette clé (« Teamtailor », « script interne »…)');
    if (!nom?.trim()) return;

    this.service
      .creerCleApi(nom.trim(), ['offres:lire', 'offres:ecrire', 'candidatures:lire'])
      .subscribe({
        next: (r) => {
          this.secretAffiche.set({ titre: 'Votre clé d’API', valeur: r.cle, note: r.message });
          this.chargerIntegrations();
        },
        error: (e) => this.toast.error(e?.error?.message ?? 'Création impossible.'),
      });
  }

  revoquerCle(id: number): void {
    if (!confirm('Révoquer cette clé ? Les appels qui l’utilisent cesseront immédiatement.')) return;

    this.service.revoquerCleApi(id).subscribe({
      next: () => {
        this.toast.success('Clé révoquée.');
        this.chargerIntegrations();
      },
    });
  }

  creerWebhook(): void {
    const url = prompt('Adresse HTTPS qui recevra les notifications');
    if (!url?.trim()) return;

    this.service
      .creerWebhook(url.trim(), ['candidature.creee', 'candidature.statut'])
      .subscribe({
        next: (r) => {
          this.secretAffiche.set({
            titre: 'Secret de signature',
            valeur: r.secret,
            note: r.message,
          });
          this.chargerIntegrations();
        },
        error: (e) => this.toast.error(e?.error?.message ?? 'Création impossible.'),
      });
  }

  supprimerWebhook(id: number): void {
    if (!confirm('Supprimer cet abonnement ?')) return;
    this.service.supprimerWebhook(id).subscribe({ next: () => this.chargerIntegrations() });
  }

  copier(valeur: string): void {
    navigator.clipboard?.writeText(valeur).then(
      () => this.toast.success('Copié.'),
      () => this.toast.error('Copie impossible : sélectionnez le texte à la main.'),
    );
  }
}
