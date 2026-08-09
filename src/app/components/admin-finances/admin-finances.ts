import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import {
  AdminPlateformeService, ResumeFinances, AbonnementAdmin, FactureAdmin, MiseEnAvantAdmin,
} from '../../services/admin-plateforme.service';

/**
 * Ce que le site encaisse.
 *
 * La facturation est réelle et testée, mais elle répond au recruteur sur
 * son propre compte. La console n'en montrait qu'un total, glissé dans la
 * page d'exploitation. Personne ne pouvait répondre à « qui paie »,
 * « quelle facture est restée impayée », « quelle mise en avant tourne
 * encore et jusqu'à quand » — les trois questions qu'on pose le jour où
 * un client appelle.
 *
 * Une règle traverse cette page : **rien ici ne débite personne**. La
 * relance est un courriel ; le marquage « réglée » enregistre un virement
 * déjà reçu. Un prélèvement lancé depuis un écran d'administration serait
 * un débit qu'aucun client n'a autorisé ce jour-là.
 */
type Onglet = 'impayes' | 'abonnements' | 'mises-en-avant';

@Component({
  selector: 'app-admin-finances',
  imports: [DatePipe],
  templateUrl: './admin-finances.html',
  styleUrl: './admin-finances.scss',
})
export class AdminFinances implements OnInit {
  private api = inject(AdminPlateformeService);
  private toastr = inject(ToastrService);

  onglet = signal<Onglet>('impayes');
  chargement = signal(true);
  occupe = signal(false);

  resume = signal<ResumeFinances | null>(null);
  abonnements = signal<AbonnementAdmin[]>([]);
  factures = signal<FactureAdmin[]>([]);
  misesEnAvant = signal<MiseEnAvantAdmin[]>([]);

  /** Les impayés seuls : c'est par eux qu'on ouvre la page. */
  impayes = computed(() => this.factures().filter((f) => f.impayee));

  /**
   * La hauteur de la plus grosse recette du graphique.
   *
   * Sert d'échelle. Zéro quand rien n'est encore rentré — et il faut
   * alors ne pas diviser par lui.
   */
  plafond = computed(() => {
    const r = this.resume()?.recettes ?? [];
    return Math.max(1, ...r.map((m) => m.ttcCentimes));
  });

  ngOnInit() { this.charger(); }

  private charger() {
    this.chargement.set(true);

    this.api.resumeFinances().subscribe({
      next: (r) => { this.resume.set(r); this.chargement.set(false); },
      error: () => { this.chargement.set(false); this.toastr.error('Les finances n’ont pas pu être chargées.'); },
    });

    this.api.factures().subscribe({ next: (f) => this.factures.set(f), error: () => this.factures.set([]) });
    this.api.abonnements().subscribe({ next: (a) => this.abonnements.set(a), error: () => this.abonnements.set([]) });
    this.api.misesEnAvant().subscribe({ next: (m) => this.misesEnAvant.set(m), error: () => this.misesEnAvant.set([]) });
  }

  rafraichir() { this.charger(); }

  /**
   * Un montant en euros, écrit à la française.
   *
   * Tout est stocké en centimes : les flottants n'ont rien à faire dans
   * une addition d'argent, et la division ne se fait qu'à l'affichage.
   */
  euros(centimes: number): string {
    return (centimes / 100).toLocaleString('fr-FR', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
    });
  }

  /** « 2026-08 » se lit « août 26 ». */
  moisCourt(iso: string): string {
    const [a, m] = iso.split('-');
    const noms = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin',
                  'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
    return `${noms[Number(m) - 1]} ${a.slice(2)}`;
  }

  hauteur(centimes: number): number {
    return Math.round((centimes / this.plafond()) * 100);
  }

  // ══════════════════════════════
  //  Les gestes
  // ══════════════════════════════

  /**
   * La relance : un courriel, et rien d'autre.
   *
   * La confirmation le dit explicitement. Un administrateur qui clique
   * doit savoir qu'il n'a rien prélevé — sans quoi il cliquera deux fois
   * en croyant que le premier n'a pas marché.
   */
  async relancer(f: FactureAdmin) {
    const r = await Swal.fire({
      title: 'Relancer ce client ?',
      html: `<p style="font-size:.92rem;line-height:1.6;text-align:left">
               Un courriel partira à <b>${AdminFinances.echapper(f.compte)}</b> avec le numéro
               ${AdminFinances.echapper(f.numero)}, le montant et un lien vers son espace.
             </p>
             <p style="font-size:.9rem;line-height:1.6;text-align:left;color:#577177;margin-top:.7rem">
               Aucun prélèvement n'est déclenché. Ses offres en ligne ne sont pas suspendues.
             </p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#01489C',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Envoyer la relance',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.occupe.set(true);
    this.api.relancerFacture(f.id).subscribe({
      next: (x) => { this.occupe.set(false); this.toastr.success(x.message); },
      error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'La relance a échoué.'); },
    });
  }

  /**
   * Enregistrer un règlement reçu ailleurs.
   *
   * Un virement arrive sur le compte bancaire sans passer par le
   * prestataire : sans ce geste, la facture reste impayée pour toujours
   * et le client se fait relancer alors qu'il a payé.
   */
  async marquerPayee(f: FactureAdmin) {
    const r = await Swal.fire({
      title: 'Enregistrer le règlement ?',
      html: `<p style="font-size:.92rem;line-height:1.6;text-align:left">
               La facture <b>${AdminFinances.echapper(f.numero)}</b>
               (${this.euros(f.montantTtcCentimes)}) passera en « réglée », et l'abonnement
               du compte repassera en service s'il était suspendu.
             </p>
             <p style="font-size:.9rem;line-height:1.6;text-align:left;color:#577177;margin-top:.7rem">
               À faire uniquement si le paiement est bien arrivé — par virement, par exemple.
               Le geste est tracé au journal avec votre nom.
             </p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#01489C',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Enregistrer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.occupe.set(true);
    this.api.marquerPayee(f.id).subscribe({
      next: (x) => { this.occupe.set(false); this.toastr.success(x.message); this.charger(); },
      error: (e) => { this.occupe.set(false); this.toastr.error(e?.error?.message ?? 'Échec.'); },
    });
  }

  private static echapper(v: unknown): string {
    return String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
