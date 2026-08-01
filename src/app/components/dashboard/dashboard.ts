import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { JobOfferService } from '../../services/job-offer';
import { AdminService } from '../../services/admin.service';
import { drilldown, to } from '../../utils/chart-drilldown';
import { VizCard, VizRow } from '../../viz/viz-card/viz-card';
import { StatTile } from '../../viz/stat-tile/stat-tile';
import { barsH, columns, donut, lines, nf } from '../../viz/chart-presets';
import { APPLICATION_STATUS, ORDINAL, SERIES, STATUS } from '../../viz/palette';

/** Une etape de l'entonnoir, avec son taux de passage depuis la precedente. */
interface Etape {
  label: string;
  value: number;
  /**
   * Part de l'etape precedente, en pourcentage. La premiere vaut 100.
   *
   * `null` quand l'etape precedente est vide : le taux n'est pas nul, il
   * n'existe pas. Afficher « 0 % » a cote de quatre acceptations parce
   * qu'aucun entretien n'a ete enregistre serait faux.
   */
  rate: number | null;
  /**
   * Vrai quand l'etape compte plus d'elements que celle d'avant.
   *
   * Un entonnoir suppose que chaque etape est un sous-ensemble de la
   * precedente. Ce n'est pas le cas ici : une candidature peut etre
   * acceptee sans qu'un entretien ait ete enregistre. Le taux depassait
   * alors 100 % — « 300 % de l'etape precedente » — ce qui ne veut rien
   * dire et faisait deborder la jauge.
   */
  overflow: boolean;
  color: string;
  icon: string;
  route: string;
  params?: Record<string, string>;
}

/**
 * Tableau de bord de l'administration — poste de pilotage.
 *
 * La version precedente montrait quatre compteurs et quatre graphiques
 * tires de `stats/detailed`, le meme jeu que voit un recruteur sur son
 * espace. Un administrateur n'ouvre pas cette page pour savoir combien il
 * y a d'offres : il l'ouvre pour savoir ce qui a bouge et ce qui l'attend.
 *
 * D'ou trois etages :
 *
 *   1. Les chiffres, avec leur ecart sur trente jours et leur allure. Un
 *      total sans variation ne dit pas si la plateforme monte ou stagne.
 *   2. L'activite du mois, trois series sur un seul axe — jamais deux
 *      echelles, le calage entre elles serait arbitraire et inventerait
 *      une correlation que la donnee ne contient pas.
 *   3. Ce qui demande une decision : la file de moderation et le journal.
 *
 * Chaque section se charge separement. L'apercu porte les compteurs et
 * arrive en premier ; le reste suit sans retenir l'affichage.
 */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, DecimalPipe, VizCard, StatTile],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private jobService = inject(JobOfferService);
  private admin = inject(AdminService);
  private router = inject(Router);

  apercu = signal<any | null>(null);
  timeline = signal<any[]>([]);
  candidatures = signal<any | null>(null);
  fileModeration = signal<any[]>([]);
  journal = signal<any[]>([]);

  chargeApercu = signal(true);
  chargeSuite = signal(true);

  ngOnInit() {
    // L'apercu porte les six tuiles de chiffres : il part seul et en
    // premier, pour que la page ait quelque chose a montrer tout de suite.
    this.jobService.getAdminStatsSection('apercu').subscribe({
      next: (d) => {
        this.apercu.set(d);
        this.chargeApercu.set(false);
      },
      error: () => this.chargeApercu.set(false),
    });

    // Le reste arrive ensemble. Une section absente ne doit pas emporter
    // les autres : chaque flux retombe sur une valeur vide.
    forkJoin({
      activite: this.jobService.getAdminStatsSection('activite').pipe(catchError(() => of(null))),
      candidatures: this.jobService.getAdminStatsSection('candidatures').pipe(catchError(() => of(null))),
      moderation: this.admin.getModerationQueue('Pending').pipe(catchError(() => of([] as any[]))),
      journal: this.admin.getActivityLogs({ page: 1 }).pipe(catchError(() => of({ logs: [] }))),
    }).subscribe((r) => {
      this.timeline.set(r.activite?.activityTimeline ?? []);
      this.candidatures.set(r.candidatures);
      this.fileModeration.set((r.moderation ?? []).slice(0, 6));
      this.journal.set((r.journal?.logs ?? []).slice(0, 7));
      this.chargeSuite.set(false);
    });
  }

  // ═══════════════════════════════════════════
  //  Tuiles de chiffres
  // ═══════════════════════════════════════════

  private serie(cle: 'offres' | 'candidatures' | 'inscriptions'): number[] {
    // Douze points suffisent a donner une allure ; trente en font une
    // chenille illisible dans une vignette de soixante pixels.
    return this.timeline().slice(-12).map((j) => j[cle] ?? 0);
  }

  sparkOffres = computed(() => this.serie('offres'));
  sparkCandidatures = computed(() => this.serie('candidatures'));
  sparkInscriptions = computed(() => this.serie('inscriptions'));

  /** Combien de comptes sont connectes a l'instant. */
  enLigne = computed(() => this.apercu()?.onlineNow ?? 0);

  // ═══════════════════════════════════════════
  //  Courbe d'activite — trois series, un seul axe
  // ═══════════════════════════════════════════

  /**
   * L'activite se lit en deux graphiques, pas en un.
   *
   * Les trois series partageaient un axe. Or les offres arrivent par
   * imports de masse — cent dix-neuf mille en une journee — quand les
   * candidatures et les inscriptions se comptent par unites. Sur une
   * echelle lineaire commune, la courbe des offres monte au plafond et
   * les deux autres se couchent sur le zero : le graphique n'affiche plus
   * qu'une seule serie, les deux autres sont un trait plat.
   *
   * `chart-presets` pose la regle et refuse le double axe, pour une bonne
   * raison — le calage des deux echelles est arbitraire et le lecteur y
   * lit une correlation que la donnee ne contient pas. Le remede prevu
   * par cette meme regle est celui-ci : deux mesures d'ordre different
   * font deux graphiques.
   */
  offresConfig = computed(() => {
    const t = this.timeline();
    if (!t.length) return null;
    return lines(
      t.map((j) => j.label),
      [{ label: 'Offres publiées', values: t.map((j) => j.offres) }],
      {
        drill: drilldown(
          this.router,
          (_i, label) => {
            const jour = this.jourIso(label);
            return jour ? to(['/admin/offres'], { jour }) : null;
          },
          { nearest: true },
        ),
      },
    );
  });

  /** Les deux mesures d'activite humaine, qui elles se comparent entre elles. */
  activiteConfig = computed(() => {
    const t = this.timeline();
    if (!t.length) return null;
    return lines(
      t.map((j) => j.label),
      [
        { label: 'Candidatures', values: t.map((j) => j.candidatures) },
        { label: 'Inscriptions', values: t.map((j) => j.inscriptions) },
      ],
      {
        drill: drilldown(
          this.router,
          (_i, label, ds) => {
            const jour = this.jourIso(label);
            if (!jour) return null;
            return ds === 0
              ? to(['/admin/candidatures'], { jour })
              : to(['/admin/utilisateurs'], { jour });
          },
          { nearest: true },
        ),
      },
    );
  });

  /** Vue tableau du graphique des offres. */
  offresRows = computed<VizRow[]>(() =>
    this.timeline()
      .slice()
      .reverse()
      .map((j) => ({ label: j.label, value: j.offres })),
  );

  /** Vue tableau du graphique candidatures + inscriptions. */
  activiteRows = computed<VizRow[]>(() =>
    this.timeline()
      .slice()
      .reverse()
      .map((j) => ({
        label: j.label,
        value: j.candidatures + j.inscriptions,
        note: `${j.candidatures} cand. · ${j.inscriptions} inscr.`,
      })),
  );

  /** « 14/03 » redevient « 2026-03-14 » pour le filtre des listes. */
  private jourIso(label: string): string | null {
    const m = label.match(/^(\d{2})\/(\d{2})$/);
    if (!m) return null;
    const [, jour, mois] = m;
    const now = new Date();
    // Une etiquette dont le mois depasse le mois courant appartient a
    // l'annee precedente : la fenetre fait trente jours, elle enjambe le
    // premier janvier une fois par an.
    const annee = Number(mois) > now.getMonth() + 1 ? now.getFullYear() - 1 : now.getFullYear();
    return `${annee}-${mois}-${jour}`;
  }

  // ═══════════════════════════════════════════
  //  Entonnoir
  // ═══════════════════════════════════════════

  /**
   * L'entonnoir n'est pas un histogramme.
   *
   * Entre trois millions de vues et quelques centaines de candidatures il
   * y a quatre ordres de grandeur : en barres, la premiere occuperait
   * toute la largeur et les trois autres seraient des traits d'un pixel.
   * La barre encode donc le taux de passage depuis l'etape precedente, et
   * le chiffre absolu se lit a cote — c'est ce que l'on vient chercher.
   */
  entonnoir = computed<Etape[]>(() => {
    const a = this.apercu();
    if (!a) return [];

    const statuts: any[] = this.candidatures()?.appsByStatus ?? [];
    const acceptees = statuts.find((s) => s.label === 'Accepted')?.value ?? 0;

    const brut = [
      { label: "Vues d'offres", value: a.totalViews ?? 0, icon: 'bi-eye', route: '/admin/offres' },
      {
        label: 'Candidatures',
        value: a.totalApplications ?? 0,
        icon: 'bi-file-earmark-text',
        route: '/admin/candidatures',
      },
      {
        label: 'Entretiens',
        value: a.totalInterviews ?? 0,
        icon: 'bi-calendar-event',
        route: '/admin/entretiens',
      },
      {
        label: 'Acceptées',
        value: acceptees,
        icon: 'bi-check-circle',
        route: '/admin/candidatures',
        params: { statut: 'Accepted' },
      },
    ];

    return brut.map((e, i) => {
      const avant = i === 0 ? e.value : brut[i - 1].value;
      const rate = i === 0 ? 100 : avant > 0 ? (e.value / avant) * 100 : null;
      return {
        ...e,
        rate,
        // Un depassement n'est pas un bon score : c'est le signe que les
        // deux etapes ne sont pas emboitees. Il se dit, il ne se chiffre pas.
        overflow: rate !== null && rate > 100,
        color: ORDINAL[Math.min(i, ORDINAL.length - 1)],
      };
    });
  });

  /** Le taux de bout en bout : une vue sur combien devient une acceptation. */
  tauxGlobal = computed(() => {
    const e = this.entonnoir();
    if (e.length < 2 || !e[0].value) return null;
    return (e[e.length - 1].value / e[0].value) * 100;
  });

  // ═══════════════════════════════════════════
  //  Repartition des candidatures
  // ═══════════════════════════════════════════

  /**
   * Ces quatre-la sont des etats, pas des series : « Acceptee » et
   * « Refusee » portent un jugement. Ils prennent donc les couleurs
   * d'etat, pas les pentes 1 a 4 — sinon le meme rouge dirait « refus »
   * ici et « quatrieme categorie » sur la carte d'a cote.
   */
  private statutsTries = computed(() => {
    const brut: any[] = this.candidatures()?.appsByStatus ?? [];
    const ordre = ['Pending', 'Reviewed', 'Accepted', 'Rejected'];
    return brut
      .slice()
      .sort((a, b) => ordre.indexOf(a.label) - ordre.indexOf(b.label))
      .map((s) => ({
        cle: s.label,
        label: APPLICATION_STATUS[s.label]?.label ?? s.label,
        value: s.value,
        color: APPLICATION_STATUS[s.label]?.color ?? STATUS.neutral,
      }));
  });

  statutsConfig = computed(() => {
    const s = this.statutsTries();
    if (!s.length) return null;
    return donut(s, {
      colors: s.map((x) => x.color),
      drill: drilldown(this.router, (i) => to(['/admin/candidatures'], { statut: s[i].cle })),
    });
  });

  statutsRows = computed<VizRow[]>(() => {
    const s = this.statutsTries();
    const total = s.reduce((n, x) => n + x.value, 0);
    return s.map((x) => ({
      label: x.label,
      value: x.value,
      note: total ? `${Math.round((x.value / total) * 100)} %` : '—',
      color: x.color,
    }));
  });

  // ═══════════════════════════════════════════
  //  Provenance des candidatures
  // ═══════════════════════════════════════════

  // Categorie nominale : toutes les barres prennent la meme teinte. Les
  // peindre d'une rampe redirait ce que la longueur montre deja, et
  // gaspillerait le seul canal libre.
  private sources = computed<any[]>(() => (this.candidatures()?.appsBySource ?? []).slice(0, 8));

  sourcesConfig = computed(() => {
    const s = this.sources();
    if (!s.length) return null;
    return columns(s, {
      unit: 'candidatures',
      drill: drilldown(this.router, (i) => to(['/admin/candidatures'], { source: s[i].label })),
    });
  });

  sourcesRows = computed<VizRow[]>(() =>
    this.sources().map((s) => ({ label: s.label, value: s.value, color: SERIES[0] })),
  );

  // ═══════════════════════════════════════════
  //  Comptes par role
  // ═══════════════════════════════════════════

  private roles = computed(() => {
    const a = this.apercu();
    if (!a) return [];
    return [
      { cle: 'Candidate', label: 'Candidats', value: a.totalCandidates ?? 0 },
      { cle: 'Recruiter', label: 'Recruteurs', value: a.totalRecruiters ?? 0 },
      { cle: 'Admin', label: 'Administrateurs', value: a.totalAdmins ?? 0 },
    ].filter((r) => r.value > 0);
  });

  rolesConfig = computed(() => {
    const r = this.roles();
    if (!r.length) return null;
    return barsH(r, {
      unit: 'comptes',
      drill: drilldown(this.router, (i) => to(['/admin/utilisateurs'], { role: r[i].cle })),
    });
  });

  rolesRows = computed<VizRow[]>(() => {
    const r = this.roles();
    const total = r.reduce((n, x) => n + x.value, 0);
    return r.map((x) => ({
      label: x.label,
      value: x.value,
      note: total ? `${Math.round((x.value / total) * 100)} %` : '—',
      color: SERIES[0],
    }));
  });

  // ═══════════════════════════════════════════
  //  Journal
  // ═══════════════════════════════════════════

  iconeAction(action: string): string {
    const map: Record<string, string> = {
      Login: 'bi-box-arrow-in-right',
      Register: 'bi-person-plus',
      ExportCSV: 'bi-download',
      ApproveOffer: 'bi-check-circle',
      RejectOffer: 'bi-x-circle',
      ToggleFeature: 'bi-star',
      CreateAnnouncement: 'bi-megaphone',
      UpdateSettings: 'bi-gear',
      ChangeRole: 'bi-shield',
      Impersonate: 'bi-person-badge',
    };
    return map[action] ?? 'bi-activity';
  }

  couleurAction(action: string): string {
    const map: Record<string, string> = {
      ApproveOffer: STATUS.good,
      RejectOffer: STATUS.critical,
      Register: STATUS.info,
      Impersonate: STATUS.serious,
    };
    return map[action] ?? STATUS.neutral;
  }

  protected readonly nf = nf;
  protected readonly SERIES = SERIES;
  protected readonly STATUS = STATUS;
  // La jauge de l'entonnoir garde un fil visible sur les etapes a taux
  // quasi nul : sans plancher, une etape reelle disparaitrait de la vue.
  protected readonly Math = Math;
}
