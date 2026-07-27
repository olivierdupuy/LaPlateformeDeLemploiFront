import { Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { ConsoleShell } from '../console-shell/console-shell';
import { Pager } from '../pager/pager';
import { companyColor } from '../../utils/job.utils';
import { pagedQuery } from '../../utils/paged-query';
import { dayLabel } from '../../utils/day-filter';

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
};

const MODERATION_LABELS: Record<string, string> = {
  Approved: 'Approuvée',
  Pending: 'En attente',
  Rejected: 'Rejetée',
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
}

interface OfferFacets {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  remote: number;
  views: number;
}

@Component({
  selector: 'app-admin-offers',
  imports: [ConsoleShell, RouterLink, FormsModule, DatePipe, Pager],
  templateUrl: './admin-offers.html',
  styleUrl: './admin-offers.scss',
})
export class AdminOffers {
  private admin = inject(AdminService);

  companyColor = companyColor;
  moderationLabel = (s?: string) => MODERATION_LABELS[s ?? ''] ?? s ?? 'En attente';

  /**
   * Les noms de l'URL sont en français pour rester lisibles ; l'API garde
   * ses propres noms. La traduction se fait ici, en un seul endroit.
   */
  q = pagedQuery<OfferRow, OfferFacets>({
    fetch: (p) => this.admin.listOffers(p),
    emptyFacets: { total: 0, approved: 0, pending: 0, rejected: 0, remote: 0, views: 0 },
    toApi: (u) => ({
      q: u['q'] ?? '',
      category: u['categorie'] ?? '',
      contractType: u['contrat'] ?? '',
      company: u['entreprise'] ?? '',
      status: u['statut'] ?? '',
      experience: u['experience'] ?? '',
      location: u['lieu'] ?? '',
      remote: u['teletravail'] === '1' ? 'true' : '',
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
}
