import { Component, inject, signal, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal, toObservable } from '@angular/core/rxjs-interop';
import { catchError, map, of, switchMap, tap } from 'rxjs';
import {
  FranceTravailService,
  EvenementEmploi,
  RechercheEvenements,
} from '../../services/france-travail.service';
import { Modale } from '../../utils/modale.directive';

/**
 * Événements emploi de France Travail, en direct de leur API.
 *
 * Forums, job datings, ateliers et salons en ligne organisés par France
 * Travail et son réseau — près de treize mille sur le territoire. C'est
 * ce qui se rapproche le plus d'une rubrique « actualités » utile sur un
 * site d'emploi : daté, situé, et sur lequel on peut agir.
 *
 * Les critères vivent dans l'URL : un forum n'a d'intérêt que si l'on
 * peut envoyer le lien à quelqu'un.
 */

/** Types d'événement, tels que l'API les code. */
const TYPES: { code: number; label: string; icon: string }[] = [
  { code: 18, label: 'Job dating', icon: 'bi-people-fill' },
  { code: 14, label: 'Forum', icon: 'bi-buildings' },
  { code: 16, label: 'Atelier', icon: 'bi-tools' },
  { code: 13, label: "Réunion d'information", icon: 'bi-info-circle' },
  { code: 17, label: 'Salon en ligne', icon: 'bi-laptop' },
  { code: 15, label: 'Conférence', icon: 'bi-mic' },
  { code: 31, label: "Visite d'entreprise", icon: 'bi-door-open' },
];

/** Les 14 grands domaines ROME. */
const SECTEURS: { code: string; label: string }[] = [
  { code: 'A', label: 'Agriculture, pêche' },
  { code: 'B', label: 'Arts, façonnage' },
  { code: 'C', label: 'Banque, assurance' },
  { code: 'D', label: 'Commerce, vente' },
  { code: 'E', label: 'Communication, médias' },
  { code: 'F', label: 'Construction, BTP' },
  { code: 'G', label: 'Hôtellerie, tourisme' },
  { code: 'H', label: 'Industrie' },
  { code: 'I', label: 'Installation, maintenance' },
  { code: 'J', label: 'Santé' },
  { code: 'K', label: 'Services à la personne' },
  { code: 'L', label: 'Spectacle' },
  { code: 'M', label: "Support à l'entreprise" },
  { code: 'N', label: 'Transport, logistique' },
];

@Component({
  selector: 'app-ft-events',
  imports: [FormsModule, DatePipe, Modale],
  templateUrl: './ft-events.html',
  styleUrl: './ft-events.scss',
})
export class FtEvents {
  private ft = inject(FranceTravailService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  types = TYPES;
  secteurs = SECTEURS;

  loading = signal(true);
  /** L'API n'a pas répondu : on le dit, un vide passerait pour une panne. */
  indisponible = signal<string | null>(null);
  selection = signal<EvenementEmploi | null>(null);

  private params = toSignal(
    this.route.queryParams.pipe(map((p) => ({ ...p }) as Record<string, string>)),
    { initialValue: {} as Record<string, string> },
  );

  private vide: RechercheEvenements = { totalElements: 0, content: [] };

  private reponse = toSignal(
    toObservable(this.params).pipe(
      tap(() => {
        this.loading.set(true);
        this.indisponible.set(null);
      }),
      switchMap((p) =>
        this.ft
          .rechercherEvenements({
            departement: p['dept'],
            type: p['type'] ? Number(p['type']) : undefined,
            modalite: p['modalite'],
            secteur: p['secteur'],
          })
          .pipe(
            catchError((e) => {
              this.indisponible.set(
                e?.error?.message ?? "Les événements n'ont pas pu être récupérés.",
              );
              return of(this.vide);
            }),
          ),
      ),
      tap(() => this.loading.set(false)),
    ),
    { initialValue: this.vide },
  );

  evenements = computed(() => this.reponse().content ?? []);
  total = computed(() => this.reponse().totalElements ?? 0);

  /**
   * Les événements arrivent à plat ; on les regroupe par journée. Une
   * liste datée se parcourt par jour, pas ligne à ligne.
   */
  parJour = computed(() => {
    const groupes = new Map<string, EvenementEmploi[]>();
    for (const e of this.evenements()) {
      const jour = (e.dateEvenement ?? '').slice(0, 10);
      const liste = groupes.get(jour);
      if (liste) liste.push(e);
      else groupes.set(jour, [e]);
    }
    return [...groupes.entries()].map(([jour, items]) => ({ jour, items }));
  });

  typeIcon = (label?: string) =>
    TYPES.find((t) => t.label.toLowerCase() === (label ?? '').toLowerCase())?.icon
    ?? 'bi-calendar-event';

  /**
   * Heure locale de l'événement.
   *
   * L'API donne les heures en UTC et le fuseau à part : un job dating
   * parisien remonte à « 07:30 » pour 9 h 30 sur place, et un atelier
   * réunionnais à « 04:30 » pour 8 h 30. Afficher la valeur brute
   * annoncerait à tout le monde une heure à laquelle rien n'a lieu.
   */
  heure(e: EvenementEmploi, borne: 'debut' | 'fin'): string {
    const brute = borne === 'debut' ? e.heureDebut : e.heureFin;
    if (!brute || !e.dateEvenement) return '';

    const jour = e.dateEvenement.slice(0, 10);
    const instant = new Date(`${jour}T${brute}Z`);
    if (Number.isNaN(instant.getTime())) return brute.slice(0, 5);

    try {
      return new Intl.DateTimeFormat('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: e.timezone || 'Europe/Paris',
      }).format(instant);
    } catch {
      // Un fuseau inconnu ne doit pas faire disparaitre l'horaire.
      return brute.slice(0, 5);
    }
  }

  aDistance = (e: EvenementEmploi) =>
    (e.modalites ?? []).some((m) => /distance|ligne/i.test(m));

  /** Places restantes, quand l'organisateur les publie. */
  placesRestantes(e: EvenementEmploi): number | null {
    const total = (e.nombrePlaceTotalPresentiel ?? 0) + (e.nombrePlaceTotalDistance ?? 0);
    if (!total) return null;
    const inscrits = (e.nombreInscritPresentiel ?? 0) + (e.nombreInscritDistance ?? 0);
    return Math.max(0, total - inscrits);
  }

  get dept(): string { return this.params()['dept'] ?? ''; }
  set dept(v: string) { this.setParam('dept', v); }

  get type(): string { return this.params()['type'] ?? ''; }
  set type(v: string) { this.setParam('type', v); }

  get secteur(): string { return this.params()['secteur'] ?? ''; }
  set secteur(v: string) { this.setParam('secteur', v); }

  get modalite(): string { return this.params()['modalite'] ?? ''; }
  set modalite(v: string) { this.setParam('modalite', v); }

  aDesFiltres = computed(() =>
    ['dept', 'type', 'secteur', 'modalite'].some((k) => this.params()[k]),
  );

  setParam(key: string, value: string | null) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { [key]: value || null },
      queryParamsHandling: 'merge',
    });
  }

  effacer() {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { dept: null, type: null, secteur: null, modalite: null },
      queryParamsHandling: 'merge',
    });
  }

  ouvrir(e: EvenementEmploi) { this.selection.set(e); }
  fermer() { this.selection.set(null); }
}
