import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import {
  AdminPlateformeService, SourceImport, Doublons,
} from '../../services/admin-plateforme.service';
import { PlateformeProService, FraicheurCatalogue } from '../../services/plateforme-pro.service';

/**
 * Le catalogue : d'où viennent les offres, et dans quel état elles sont.
 *
 * Les points d'entrée existaient depuis le début, réservés aux
 * administrateurs, et n'étaient appelés par rien : diagnostic des sources,
 * comptage des doublons, purge, ré-analyse des salaires, déclenchement
 * d'import. Il n'y avait aucun écran, donc aucun de ces gestes n'était
 * possible autrement qu'en tapant une URL.
 *
 * Le besoin était avéré : l'import France Travail n'a jamais tourné en
 * production, et rien ne permettait de s'en apercevoir. La page
 * d'exploitation montre un battement de cœur — « la tâche est passée » —
 * pas un bilan.
 */
@Component({
  selector: 'app-admin-catalogue',
  imports: [DatePipe, DecimalPipe, RouterLink],
  templateUrl: './admin-catalogue.html',
  styleUrl: './admin-catalogue.scss',
})
export class AdminCatalogue implements OnInit {
  private api = inject(AdminPlateformeService);
  private pro = inject(PlateformeProService);
  private toastr = inject(ToastrService);

  chargement = signal(true);
  sources = signal<{ cle: string; etat: SourceImport }[]>([]);
  fraicheur = signal<FraicheurCatalogue | null>(null);
  doublons = signal<Doublons | null>(null);

  /** Un import tourne : le bouton se verrouille et le dit. */
  importEnCours = signal(false);
  occupe = signal(false);

  /**
   * Les sources qui ne répondent pas.
   *
   * Une source non configurée n'est pas une panne — c'est un choix. Une
   * source configurée qui renvoie une erreur ou zéro résultat en est une,
   * et c'est elle qu'on veut voir en premier.
   */
  enPanne = computed(() =>
    this.sources().filter((s) => s.etat.configured && (s.etat.error || s.etat.results === 0)));

  configurees = computed(() => this.sources().filter((s) => s.etat.configured).length);

  ngOnInit() { this.charger(); }

  private charger() {
    this.chargement.set(true);

    this.api.diagnostics().subscribe({
      next: (d) => {
        this.sources.set(Object.entries(d).map(([cle, etat]) => ({ cle, etat })));
        this.chargement.set(false);
      },
      error: () => { this.chargement.set(false); this.toastr.error('Le diagnostic des sources a échoué.'); },
    });

    this.pro.catalogue().subscribe({
      next: (c) => this.fraicheur.set(c),
      error: () => this.fraicheur.set(null),
    });

    this.chargerDoublons();
  }

  private chargerDoublons() {
    this.api.doublons().subscribe({
      next: (d) => this.doublons.set(d),
      error: () => this.doublons.set(null),
    });
  }

  rafraichir() { this.charger(); }

  /** Le libellé d'une source, tel qu'on la nomme entre humains. */
  nomSource(cle: string): string {
    const noms: Record<string, string> = {
      adzuna: 'Adzuna',
      jooble: 'Jooble',
      francetravail: 'France Travail',
      arbeitnow: 'Arbeitnow',
      remotive: 'Remotive',
    };
    return noms[cle] ?? cle;
  }

  etatSource(s: SourceImport): string {
    if (!s.configured) return 'non configurée';
    if (s.error) return 'en erreur';
    if (s.results === 0) return 'aucun résultat';
    return `${s.results} offres à l'essai`;
  }

  // ══════════════════════════════
  //  Les gestes
  // ══════════════════════════════

  async lancerImport() {
    const r = await Swal.fire({
      title: 'Lancer un import ?',
      html: `<p style="font-size:.92rem;line-height:1.6;text-align:left">
               Toutes les sources configurées seront interrogées. L'import tourne en
               arrière-plan : les offres apparaîtront au fil de l'eau, et chaque annonce
               passe par l'analyse de fraude avant d'entrer au catalogue.
             </p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#15616d',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Lancer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.importEnCours.set(true);
    this.api.lancerImport().subscribe({
      next: (x) => {
        this.toastr.success(x.message, 'Import lancé', { timeOut: 9000 });
        // L'import tourne en arrière-plan : on relit dans une minute
        // plutôt que de laisser croire qu'il n'a rien fait.
        setTimeout(() => { this.importEnCours.set(false); this.charger(); }, 60000);
      },
      error: (e) => {
        this.importEnCours.set(false);
        this.toastr.warning(e?.error?.message ?? 'L’import n’a pas pu démarrer.');
      },
    });
  }

  /**
   * La purge, en deux temps.
   *
   * Le serveur simule par défaut et n'écrit que sur `apply=true` : on
   * montre donc d'abord ce qui serait supprimé, avec les candidatures que
   * cela emporterait — elles sont en suppression en cascade, et personne
   * ne doit découvrir ça après coup.
   */
  async purger() {
    const d = this.doublons();
    if (!d || d.duplicatedGroups === 0) return;

    const risque = d.atRisk.applications + d.atRisk.favourites + d.atRisk.reports;
    const alerte = risque > 0
      ? `<p style="font-size:.9rem;line-height:1.6;text-align:left;color:#c6364b;margin-top:.7rem">
           <b>${d.atRisk.applications} candidature(s)</b>, ${d.atRisk.favourites} favori(s) et
           ${d.atRisk.reports} signalement(s) sont rattachés aux exemplaires en trop.
           Ils seront supprimés en cascade avec eux.
         </p>`
      : '';

    const r = await Swal.fire({
      title: 'Supprimer les doublons ?',
      html: `<p style="font-size:.92rem;line-height:1.6;text-align:left">
               ${d.duplicatedGroups} groupe(s) en double, soit ${d.surplusRows} ligne(s) en trop.
               L'exemplaire le plus ancien est conservé, les autres sont supprimés.
             </p>${alerte}`,
      icon: risque > 0 ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: '#c6364b',
      cancelButtonColor: '#577177',
      confirmButtonText: 'Supprimer',
      cancelButtonText: 'Annuler',
    });
    if (!r.isConfirmed) return;

    this.occupe.set(true);
    this.api.purgerDoublons(true).subscribe({
      next: (x) => {
        this.occupe.set(false);
        this.toastr.success(`${x['offersDeleted'] ?? 0} offre(s) supprimée(s).`);
        this.chargerDoublons();
      },
      error: (e) => {
        this.occupe.set(false);
        this.toastr.error(e?.error?.message ?? 'La purge a échoué.');
      },
    });
  }

  reanalyserSalaires() {
    this.occupe.set(true);
    this.api.reanalyserSalaires().subscribe({
      next: (x) => { this.occupe.set(false); this.toastr.success(x.message); },
      error: () => { this.occupe.set(false); this.toastr.error('La ré-analyse a échoué.'); },
    });
  }
}
