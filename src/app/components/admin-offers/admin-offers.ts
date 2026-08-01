import { Component, inject, computed } from '@angular/core';
import { DatePipe, DecimalPipe, PercentPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { Pager } from '../pager/pager';
import { companyColor, salaryLabel } from '../../utils/job.utils';
import { EmployerNamePipe, estEmployeurAnonyme } from '../../pipes/employer-name.pipe';
import { pagedQuery } from '../../utils/paged-query';
import { dayLabel } from '../../utils/day-filter';
import { MODERATION_STATUS, STATUS } from '../../viz/palette';

/**
 * Explorateur d'offres : la destination des graphiques du panneau.
 *
 * Le catalogue se compte en centaines de lignes et grossira : le tri, le
 * filtre et la découpe se font sur le serveur, et seule la page affichée
 * traverse le réseau.
 *
 * Chaque critère vit dans l'URL. Un graphique n'a alors rien à savoir de
 * cette page — il navigue vers une adresse — et la liste obtenue se
 * partage, se recharge et se remonte dans l'historique sans rien perdre.
 */

const FILTER_LABELS: Record<string, string> = {
  categorie: 'Catégorie',
  contrat: 'Contrat',
  entreprise: 'Entreprise',
  statut: 'Statut',
  experience: 'Expérience',
  lieu: 'Lieu',
  q: 'Recherche',
  teletravail: 'Télétravail',
  jour: 'Publiée le',
  source: 'Provenance',
};

/**
 * Provenance d'une offre. Le catalogue est massivement importé : sans ce
 * repère, rien ne distingue les quelques milliers d'offres déposées sur la
 * plateforme — les seules dont la modération et la qualité nous incombent —
 * des centaines de milliers reprises chez un partenaire.
 */
const SOURCE_LABELS: Record<string, string> = {
  local: 'Plateforme',
  francetravail: 'France Travail',
  arbeitnow: 'Arbeitnow',
  remotive: 'Remotive',
};

const sourceLabel = (s?: string | null) => SOURCE_LABELS[s ?? 'local'] ?? (s || 'Plateforme');

// Les libelles et les couleurs d'etat viennent de la palette : le meme
// vert doit dire « approuvee » ici, sur le tableau de bord et dans la
// file de moderation.
const MODERATION_LABELS: Record<string, string> = {
  Approved: MODERATION_STATUS['Approved'].label,
  Pending: MODERATION_STATUS['Pending'].label,
  Rejected: MODERATION_STATUS['Rejected'].label,
};

/** Ce que le serveur renvoie pour le tableau — pas l'offre entière. */
interface OfferRow {
  id: number;
  title: string;
  company: string;
  location: string;
  category: string;
  contractType: string;
  isRemote: boolean;
  createdAt: string;
  viewCount: number;
  moderationStatus?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  salaryPeriod?: string | null;
  externalSource?: string | null;
  isFeatured?: boolean;
  isUrgent?: boolean;
}

interface OfferFacets {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  remote: number;
  views: number;
  local: number;
  noSalary: number;
}

@Component({
  selector: 'app-admin-offers',
  imports: [DecimalPipe, PercentPipe, RouterLink, FormsModule, DatePipe, Pager, EmployerNamePipe],
  templateUrl: './admin-offers.html',
  styleUrl: './admin-offers.scss',
})
export class AdminOffers {
  private admin = inject(AdminService);

  companyColor = companyColor;
  moderationLabel = (s?: string) => MODERATION_LABELS[s ?? ''] ?? s ?? 'En attente';
  salaryLabel = salaryLabel;
  sourceLabel = sourceLabel;
  employeurAnonyme = estEmployeurAnonyme;

  /** Une offre importée porte le nom du partenaire, pas celui du site. */
  estImportee = (o: OfferRow) => !!o.externalSource;

  /**
   * Rémunération invraisemblable.
   *
   * L'analyse des libellés de France Travail a été corrigée et le
   * catalogue réanalysé, mais l'erreur restante n'est plus dans
   * l'analyseur : elle est dans la source. « Annuel de 0.0 Euros à
   * 200000.0 Euros » sur un poste de poseur photovoltaïque est un champ
   * laissé à sa valeur par défaut, et aucune analyse ne le rattrapera.
   *
   * La console cesse donc de faire confiance au montant et signale ce qui
   * sort des bornes du marché. Le plafond est haut — les spécialités
   * médicales dépassent réellement 150 000 € — mais au-delà de 200 000 €
   * on ne recrute plus par petite annonce, et sous 3 000 € par an il ne
   * s'agit plus d'un salaire.
   */
  salaireSuspect(o: OfferRow): boolean {
    if ((o.salaryPeriod || 'an') !== 'an') return false;
    const bornes = [o.minSalary, o.maxSalary].filter((v): v is number => v != null);
    return bornes.some((v) => v < 3_000 || v >= 200_000);
  }

  /** Les teintes des tuiles de filtre, pour que la pastille dise l'etat. */
  protected readonly ETAT = STATUS;

  /** Icone, libelle et couleur d'un statut de moderation. */
  etat(statut?: string) {
    return MODERATION_STATUS[statut || 'Pending'] ?? MODERATION_STATUS['Pending'];
  }

  /**
   * Les noms de l'URL sont en français pour rester lisibles ; l'API garde
   * ses propres noms. La traduction se fait ici, en un seul endroit.
   */
  q = pagedQuery<OfferRow, OfferFacets>({
    fetch: (p) => this.admin.listOffers(p),
    emptyFacets: { total: 0, approved: 0, pending: 0, rejected: 0, remote: 0, views: 0, local: 0, noSalary: 0 },
    toApi: (u) => ({
      q: u['q'] ?? '',
      category: u['categorie'] ?? '',
      contractType: u['contrat'] ?? '',
      company: u['entreprise'] ?? '',
      status: u['statut'] ?? '',
      experience: u['experience'] ?? '',
      location: u['lieu'] ?? '',
      remote: u['teletravail'] === '1' ? 'true' : '',
      source: u['source'] ?? '',
      day: u['jour'] ?? '',
      sort: u['tri'] ?? '',
      page: u['page'] ?? '',
      pageSize: u['taille'] ?? '',
    }),
  });

  activeFilters = computed(() =>
    Object.entries(this.q.params())
      .filter(([k, v]) => FILTER_LABELS[k] && v)
      .map(([key, value]) => ({
        key,
        label: FILTER_LABELS[key],
        value:
          key === 'statut' ? this.moderationLabel(String(value))
          : key === 'jour' ? dayLabel(String(value))
          : key === 'teletravail' ? 'Oui'
          : key === 'source' ? sourceLabel(String(value))
          : String(value),
      })),
  );

  get search(): string {
    return this.q.params()['q'] ?? '';
  }
  set search(value: string) {
    this.q.onSearch(value);
  }

  get sort(): string {
    return this.q.params()['tri'] ?? 'recent';
  }
  set sort(value: string) {
    this.q.setParam('tri', value === 'recent' ? null : value);
  }

  get source(): string {
    return this.q.params()['source'] ?? '';
  }
  set source(value: string) {
    this.q.setParam('source', value || null);
  }
}
