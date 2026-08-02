import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { RouterLink } from '@angular/router';
import {
  PlateformeProService,
  ErreurNavigateur,
  FraicheurCatalogue,
  Recettes,
} from '../../services/plateforme-pro.service';

/**
 * Exploitation : ce qui casse, ce qui tourne, ce qui a vieilli.
 *
 * `/api/sante` existait déjà et savait dire « sain / dégradé / en
 * panne ». Personne ne l'interrogeait. Quant aux exceptions JavaScript
 * chez les visiteurs, elles n'allaient nulle part : une console que
 * personne n'ouvre, sur un appareil qu'on ne possède pas. Un écran
 * blanc pour tous les utilisateurs de Safari pouvait tenir des semaines
 * — le serveur, lui, répondait 200 à tout.
 *
 * Cette page réunit les deux : l'état des services, et la liste des
 * fautes remontées par les navigateurs, regroupées par empreinte avec
 * leur nombre d'occurrences. Classer une erreur la sort de la liste
 * sans l'effacer ; si elle se reproduit, elle y revient.
 */
@Component({
  selector: 'app-admin-operations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-operations.html',
  styleUrl: './admin-operations.scss',
})
export class AdminOperations implements OnInit {
  private service = inject(PlateformeProService);
  private toast = inject(ToastrService);

  readonly sante = signal<Record<string, unknown> | null>(null);
  readonly catalogue = signal<FraicheurCatalogue | null>(null);

  /**
   * Ce que le service rapporte.
   *
   * Placé ici et non dans les statistiques : celles-ci répondent à
   * « qu'est-ce qui marche », l'exploitation à « est-ce que ça tourne ».
   * Un service commercial dont on ne sait pas s'il encaisse ne tourne
   * qu'à moitié. Le panneau reste discret tant qu'aucune facture n'a
   * été émise — il n'y a alors rien à montrer.
   */
  readonly recettes = signal<Recettes | null>(null);
  readonly erreurs = signal<ErreurNavigateur[]>([]);
  readonly classees = signal(false);
  readonly chargement = signal(true);
  readonly detail = signal<number | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);

    this.service.sante().subscribe({
      next: (s) => this.sante.set(s as Record<string, unknown>),
      error: () => this.sante.set(null),
    });

    this.service.catalogue().subscribe({
      next: (c) => this.catalogue.set(c),
      error: () => this.catalogue.set(null),
    });

    this.service.recettes().subscribe({
      next: (r) => this.recettes.set(r),
      error: () => this.recettes.set(null),
    });

    this.service.erreursNavigateur(this.classees()).subscribe({
      next: (e) => {
        this.erreurs.set(e);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  basculerVue(): void {
    this.classees.set(!this.classees());
    this.charger();
  }

  classer(e: ErreurNavigateur): void {
    this.service.classerErreur(e.id, !this.classees()).subscribe({
      next: () => {
        this.toast.success(this.classees() ? 'Erreur réouverte.' : 'Erreur classée.');
        this.erreurs.set(this.erreurs().filter((x) => x.id !== e.id));
      },
    });
  }

  /**
   * L'état est un objet libre côté serveur : on l'affiche tel qu'il
   * vient plutôt que de figer ici une forme qui divergerait au premier
   * ajout de sonde.
   */
  lignesSante(): { cle: string; valeur: string }[] {
    const s = this.sante();
    if (!s) return [];

    return Object.entries(s).map(([cle, valeur]) => ({
      cle,
      valeur: typeof valeur === 'object' ? JSON.stringify(valeur) : String(valeur),
    }));
  }

  euros(centimes: number): string {
    return (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }

  couleurEtat(valeur: string): string {
    const v = valeur.toLowerCase();
    if (v.includes('panne') || v.includes('false') || v.includes('erreur')) return 'badge-red';
    if (v.includes('degrade') || v.includes('dégradé')) return 'badge-yellow';
    return 'badge-green';
  }
}
