import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import * as L from 'leaflet';
import { JobOfferService } from '../../services/job-offer';
import { drilldown, to } from '../../utils/chart-drilldown';
import { findCity } from '../../utils/france-geo';
import { StatTile } from '../../viz/stat-tile/stat-tile';
import { VizCard, VizRow } from '../../viz/viz-card/viz-card';
import { barsH, columns, donut, lines, nf, stacked } from '../../viz/chart-presets';
import { APPLICATION_STATUS, ORDINAL, SEQUENTIAL, SERIES, STATUS } from '../../viz/palette';

interface Onglet {
  cle: string;
  label: string;
  icon: string;
  /** Section a demander au serveur pour peupler cet onglet. */
  section: string;
}

/** Couche de la carte : qui l'on compte, et sous quelle teinte. */
interface Couche {
  cle: 'candidates' | 'recruiters' | 'offers';
  label: string;
  champ: string;
  nom: string;
  color: string;
  icon: string;
}

/**
 * Statistiques de la plateforme.
 *
 * Le fichier faisait quarante-six kilo-octets pour dix-sept graphiques,
 * et chacun portait sa propre copie des memes quatre-vingts lignes
 * d'options Chart.js — une grille eclaircie ici et pas la, une infobulle
 * restee au fond noir par defaut, deux legendes a droite quand les autres
 * etaient en haut. Les reglages vivent desormais dans les fabriques
 * partagees ; il ne reste ici que ce que la page a de propre : quelle
 * donnee, quelle forme, ou mene un clic.
 *
 * La palette a change de nature au passage. Les categories etaient
 * peintes d'une rampe d'ardoise : « Informatique », « Sante » et
 * « Commerce » sortaient en trois gris bleutes voisins, et la couleur ne
 * disait plus laquelle est laquelle — elle ne faisait que redire la
 * longueur de la barre. Une categorie nominale prend donc une teinte
 * unique, et seules les series distinctes recoivent les huit teintes
 * d'identite.
 *
 * Le chargement reste par section : dix-sept graphiques montes d'un coup
 * sur une reponse de deux cents kilo-octets se payaient en secondes.
 */
@Component({
  selector: 'app-admin-stats',
  imports: [VizCard, StatTile],
  templateUrl: './admin-stats.html',
  styleUrl: './admin-stats.scss',
})
export class AdminStats implements OnInit, OnDestroy {
  private jobService = inject(JobOfferService);
  private router = inject(Router);

  /** Toutes les sections recues, fusionnees : le gabarit ne lit qu'un objet. */
  data = signal<any>({});
  loading = signal(true);
  chargementSection = signal(false);

  onglets: Onglet[] = [
    { cle: 'apercu', label: "Vue d'ensemble", icon: 'bi-speedometer2', section: 'activite' },
    { cle: 'offres', label: 'Offres', icon: 'bi-briefcase', section: 'offres' },
    { cle: 'candidatures', label: 'Candidatures', icon: 'bi-file-earmark-text', section: 'candidatures' },
    { cle: 'utilisateurs', label: 'Utilisateurs', icon: 'bi-people', section: 'utilisateurs' },
    { cle: 'echanges', label: 'Entretiens et messagerie', icon: 'bi-chat-dots', section: 'echanges' },
  ];

  onglet = signal<string>('apercu');

  /** Sections deja recues : on ne redemande pas ce qu'on a. */
  private recues = new Set<string>();

  // ── Carte ──
  couches: Couche[] = [
    { cle: 'candidates', label: 'Candidats', champ: 'candidatesByCity', nom: 'candidat', color: SERIES[0], icon: 'bi-person' },
    { cle: 'recruiters', label: 'Recruteurs', champ: 'recruitersByCity', nom: 'recruteur', color: SERIES[1], icon: 'bi-building' },
    { cle: 'offers', label: 'Offres', champ: 'offersByLocation', nom: 'offre', color: SERIES[4], icon: 'bi-briefcase' },
  ];

  coucheActive = signal<'candidates' | 'recruiters' | 'offers'>('candidates');

  private mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');
  private map: L.Map | null = null;
  private mapLayers: Record<string, L.LayerGroup> = {};

  constructor() {
    // La carte se monte quand son conteneur entre dans le DOM — c'est-a-dire
    // quand on ouvre l'onglet « Utilisateurs » — et pas avant.
    effect(() => {
      const host = this.mapHost()?.nativeElement;
      const d = this.data();
      if (!host || !d?.candidatesByCity) return;
      this.monterCarte(host, d);
    });
  }

  ngOnInit() {
    // L'apercu porte les compteurs, affiches sur tous les onglets : il se
    // charge toujours, et d'abord.
    this.charger('apercu', () => {
      this.loading.set(false);
      this.charger('activite');
    });
  }

  ngOnDestroy() {
    this.map?.remove();
  }

  changerOnglet(cle: string) {
    if (cle === this.onglet()) return;
    this.onglet.set(cle);

    // Les cartes de graphique se demontent avec l'onglet quitte et
    // liberent leur Chart elles-memes : rien a faire ici.
    if (cle !== 'utilisateurs') {
      this.map?.remove();
      this.map = null;
      this.mapLayers = {};
    }

    const section = this.onglets.find((o) => o.cle === cle)?.section;
    if (section) this.charger(section);
  }

  private charger(section: string, ensuite?: () => void) {
    if (this.recues.has(section)) {
      ensuite?.();
      return;
    }

    this.chargementSection.set(true);
    this.jobService.getAdminStatsSection(section).subscribe({
      next: (d) => {
        this.recues.add(section);
        // On fusionne plutot que de remplacer : le gabarit lit un seul
        // objet, quelle que soit la section qui l'a rempli.
        this.data.update((courant: any) => ({ ...(courant ?? {}), ...d }));
        this.chargementSection.set(false);
        ensuite?.();
      },
      error: () => {
        this.chargementSection.set(false);
        this.loading.set(false);
      },
    });
  }

  // ═══════════════════════════════════════════
  //  Vue d'ensemble
  // ═══════════════════════════════════════════

  private timeline = computed<any[]>(() => this.data()?.activityTimeline ?? []);

  /**
   * Les offres a part, les personnes ensemble.
   *
   * Les trois series partageaient un axe. Les offres arrivent par imports
   * de masse — plus de cent mille en une journee — quand les candidatures
   * et les inscriptions se comptent par unites : sur une echelle lineaire
   * commune, seule la courbe des offres se voyait, les deux autres etaient
   * un trait plat sur le zero.
   *
   * `chart-presets` interdit le double axe et prescrit ce remede : deux
   * mesures d'ordre different font deux graphiques.
   */
  offresConfig = computed(() => {
    const t = this.timeline();
    if (!t.length) return null;
    return lines(
      t.map((j) => j.label),
      [{ label: 'Offres publiées', values: t.map((j) => j.offres) }],
      { drill: drilldown(this.router, () => to(['/admin/offres']), { nearest: true }) },
    );
  });

  offresRows = computed<VizRow[]>(() =>
    this.timeline().slice().reverse().map((j) => ({ label: j.label, value: j.offres })),
  );

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
          (_i, _label, ds) => to([ds === 0 ? '/admin/candidatures' : '/admin/utilisateurs']),
          { nearest: true },
        ),
      },
    );
  });

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

  // ═══════════════════════════════════════════
  //  Offres
  // ═══════════════════════════════════════════

  private pts = (champ: string): any[] => this.data()?.[champ] ?? [];

  offresJourConfig = computed(() => {
    const p = this.pts('offersByDay');
    if (!p.length) return null;
    return lines(
      p.map((x) => x.label),
      [{ label: 'Offres publiées', values: p.map((x) => x.value) }],
      { drill: drilldown(this.router, () => to(['/admin/offres'])) },
    );
  });

  categoriesConfig = computed(() => {
    const p = this.pts('offersByCategory');
    if (!p.length) return null;
    return barsH(p, {
      unit: 'offres',
      drill: drilldown(this.router, (i) => to(['/admin/offres'], { categorie: p[i].label })),
    });
  });

  contratsConfig = computed(() => {
    const p = this.pts('offersByContract');
    if (!p.length) return null;
    // Six parts au plus : au-dela, l'anneau ne se lit plus et la liste
    // est plus honnete. Le reste part dans « Autres ».
    const tete = p.slice(0, 6);
    const reste = p.slice(6).reduce((n, x) => n + x.value, 0);
    const parts = reste ? [...tete, { label: 'Autres', value: reste }] : tete;
    return donut(parts, {
      unit: 'offres',
      drill: drilldown(this.router, (i) =>
        i < tete.length ? to(['/admin/offres'], { contrat: tete[i].label }) : null,
      ),
    });
  });

  /**
   * L'experience requise est un palier ordonne — debutant, confirme,
   * senior : echanger deux niveaux changerait le sens. C'est donc la
   * rampe, pas les teintes d'identite, et l'ordre se lit dans la couleur.
   *
   * Encore faut-il que les barres soient dans le bon ordre. Le serveur
   * les renvoie triees par effectif : la rampe posait alors du clair sur
   * « Junior », du fonce sur « Senior » et du plus clair encore sur
   * « Intermediaire », ce qui affirmait une progression fausse. On remet
   * donc les paliers dans leur ordre avant de les peindre.
   */
  private niveauxExperience = computed(() => {
    const rang = (label: string) => {
      const l = label.toLowerCase();
      if (/debut|junior|0|aucune|sans/.test(l)) return 0;
      if (/interm|confirm|2|3/.test(l)) return 1;
      if (/senior|5/.test(l)) return 2;
      if (/expert|lead|10/.test(l)) return 3;
      return 9; // Palier non reconnu : rejete en fin de liste.
    };
    return this.pts('offersByExperience')
      .slice()
      .sort((a, b) => rang(a.label) - rang(b.label));
  });

  experienceConfig = computed(() => {
    const p = this.niveauxExperience();
    if (!p.length) return null;
    return barsH(p, {
      unit: 'offres',
      ordinal: true,
      drill: drilldown(this.router, (i) => to(['/admin/offres'], { experience: p[i].label })),
    });
  });

  experienceRows = computed<VizRow[]>(() =>
    this.niveauxExperience().map((x, i) => ({
      label: x.label,
      value: x.value,
      color: ORDINAL[Math.min(i, ORDINAL.length - 1)],
    })),
  );

  villesConfig = computed(() => {
    const p = this.pts('offersByLocation').slice(0, 15);
    if (!p.length) return null;
    return barsH(p, {
      unit: 'offres',
      drill: drilldown(this.router, (i) => to(['/admin/offres'], { lieu: p[i].label })),
    });
  });

  /**
   * Salaires : deux mesures de meme nature et de meme echelle — un
   * minimum et un maximum en euros — donc un seul axe. Deux echelles
   * verticales inventeraient un rapport entre elles.
   */
  salairesConfig = computed(() => {
    const p = this.pts('salaryByCategory');
    if (!p.length) return null;
    return stacked(
      p.map((x) => x.label),
      [
        { label: 'Salaire minimum moyen', values: p.map((x) => x.min) },
        { label: 'Amplitude jusqu\'au maximum', values: p.map((x) => x.max - x.min) },
      ],
      {
        horizontal: true,
        unit: '€',
        drill: drilldown(this.router, (i) => to(['/admin/offres'], { categorie: p[i].label })),
      },
    );
  });

  salairesRows = computed<VizRow[]>(() =>
    this.pts('salaryByCategory').map((x) => ({
      label: x.label,
      value: `${nf(x.min)} – ${nf(x.max)} €`,
      note: `${nf(x.max - x.min)} € d'amplitude`,
    })),
  );

  entreprisesConfig = computed(() => {
    const p = this.pts('topCompanies');
    if (!p.length) return null;
    return barsH(p, {
      unit: 'offres',
      drill: drilldown(this.router, (i) => to(['/admin/offres'], { entreprise: p[i].label })),
    });
  });

  vuesConfig = computed(() => {
    const p = this.pts('topViewedOffers');
    if (!p.length) return null;
    return barsH(p, {
      unit: 'vues',
      drill: drilldown(this.router, () => to(['/admin/offres'], { tri: 'views' })),
    });
  });

  vuesRows = computed<VizRow[]>(() =>
    this.pts('topViewedOffers').map((x) => ({ label: x.label, value: x.value, note: x.company })),
  );

  // ═══════════════════════════════════════════
  //  Candidatures
  // ═══════════════════════════════════════════

  private statuts = computed(() => {
    const ordre = ['Pending', 'Reviewed', 'Accepted', 'Rejected'];
    return this.pts('appsByStatus')
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
    const s = this.statuts();
    if (!s.length) return null;
    return donut(s, {
      colors: s.map((x) => x.color),
      drill: drilldown(this.router, (i) => to(['/admin/candidatures'], { statut: s[i].cle })),
    });
  });

  statutsRows = computed<VizRow[]>(() => {
    const s = this.statuts();
    const total = s.reduce((n, x) => n + x.value, 0);
    return s.map((x) => ({
      label: x.label,
      value: x.value,
      note: total ? `${Math.round((x.value / total) * 100)} %` : '—',
      color: x.color,
    }));
  });

  candJourConfig = computed(() => {
    const p = this.pts('appsByDay');
    if (!p.length) return null;
    return lines(
      p.map((x) => x.label),
      [{ label: 'Candidatures', values: p.map((x) => x.value) }],
      { drill: drilldown(this.router, () => to(['/admin/candidatures'])) },
    );
  });

  sourcesConfig = computed(() => {
    const p = this.pts('appsBySource');
    if (!p.length) return null;
    return columns(p, {
      unit: 'candidatures',
      drill: drilldown(this.router, (i) => to(['/admin/candidatures'], { source: p[i].label })),
    });
  });

  conversionConfig = computed(() => {
    const p = this.pts('conversionByCompany');
    if (!p.length) return null;
    return barsH(p, {
      unit: '%',
      drill: drilldown(this.router, (i) => to(['/admin/offres'], { entreprise: p[i].label })),
    });
  });

  conversionRows = computed<VizRow[]>(() =>
    this.pts('conversionByCompany').map((x) => ({
      label: x.label,
      value: `${String(x.value).replace('.', ',')} %`,
    })),
  );

  // ═══════════════════════════════════════════
  //  Utilisateurs
  // ═══════════════════════════════════════════

  inscriptionsConfig = computed(() => {
    const p = this.pts('registrationsByDay');
    if (!p.length) return null;
    return lines(
      p.map((x) => x.label),
      [{ label: 'Inscriptions', values: p.map((x) => x.value) }],
      { drill: drilldown(this.router, () => to(['/admin/utilisateurs'])) },
    );
  });

  villesUsersConfig = computed(() => {
    const p = this.pts('usersByCity');
    if (!p.length) return null;
    return barsH(p, {
      unit: 'comptes',
      drill: drilldown(this.router, (i) => to(['/admin/utilisateurs'], { ville: p[i].label })),
    });
  });

  // ═══════════════════════════════════════════
  //  Entretiens et messagerie
  // ═══════════════════════════════════════════

  typesEntretienConfig = computed(() => {
    const p = this.pts('interviewsByType');
    if (!p.length) return null;
    return donut(p, {
      unit: 'entretiens',
      drill: drilldown(this.router, (i) => to(['/admin/entretiens'], { type: p[i].label })),
    });
  });

  statutsEntretienConfig = computed(() => {
    const p = this.pts('interviewsByStatus');
    if (!p.length) return null;
    return columns(p, {
      unit: 'entretiens',
      drill: drilldown(this.router, (i) => to(['/admin/entretiens'], { statut: p[i].label })),
    });
  });

  messagesConfig = computed(() => {
    const p = this.pts('messagesByDay');
    if (!p.length) return null;
    return lines(
      p.map((x) => x.label),
      [{ label: 'Messages', values: p.map((x) => x.value) }],
    );
  });

  /** Vue tableau generique : libelle et valeur, dans l'ordre du graphique. */
  rows(champ: string, limite = 100): VizRow[] {
    return this.pts(champ)
      .slice(0, limite)
      .map((x) => ({ label: x.label, value: x.value, color: SERIES[0] }));
  }

  // ═══════════════════════════════════════════
  //  Carte
  // ═══════════════════════════════════════════

  private monterCarte(el: HTMLDivElement, d: any) {
    if (this.map) return;

    // Un conteneur sans hauteur donne une carte d'un pixel : on attend
    // que la mise en page ait pose ses dimensions.
    if (el.clientHeight === 0) {
      setTimeout(() => this.monterCarte(el, d), 100);
      return;
    }

    this.map = L.map(el, {
      center: [46.6, 2.5],
      zoom: 5,
      zoomControl: true,
      scrollWheelZoom: false, // la molette fait defiler la page, pas zoomer
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    L.control
      .attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://carto.com/">CARTO</a>')
      .addTo(this.map);

    for (const c of this.couches) {
      this.mapLayers[c.cle] = this.coucheVille(d[c.champ] ?? [], c);
    }
    this.mapLayers[this.coucheActive()]?.addTo(this.map);

    // La carte se monte dans un onglet qui vient d'apparaitre : sa taille
    // n'est pas encore stabilisee au premier rendu.
    const map = this.map;
    setTimeout(() => map.invalidateSize(), 150);
    setTimeout(() => map.invalidateSize(), 500);
  }

  /**
   * Une couche de pastilles proportionnelles.
   *
   * L'aire du disque suit la valeur, pas son rayon : a rayon
   * proportionnel, une ville deux fois plus peuplee occupe quatre fois la
   * surface et le lecteur surestime l'ecart.
   */
  private coucheVille(items: { label: string; value: number }[], c: Couche): L.LayerGroup {
    const group = L.layerGroup();
    const max = Math.max(...items.map((i) => i.value), 1);

    for (const item of items) {
      const coords = findCity(item.label);
      if (!coords) continue;

      const rayon = 5 + Math.sqrt(item.value / max) * 24;
      const cercle = L.circleMarker(coords, {
        radius: rayon,
        fillColor: c.color,
        fillOpacity: 0.42,
        color: c.color,
        weight: 2,
        opacity: 0.9,
      });

      cercle.bindPopup(
        `<div class="mp"><strong>${item.label}</strong>` +
          `<span class="mp-val" style="color:${c.color}">${nf(item.value)}</span>` +
          `<span class="mp-nom">${c.nom}${item.value > 1 ? 's' : ''}</span></div>`,
        { closeButton: false, className: 'map-popup' },
      );

      cercle.on('mouseover', () => cercle.openPopup());
      cercle.on('mouseout', () => cercle.closePopup());

      group.addLayer(cercle);
    }
    return group;
  }

  changerCouche(cle: 'candidates' | 'recruiters' | 'offers') {
    this.coucheActive.set(cle);
    if (!this.map) return;
    Object.values(this.mapLayers).forEach((l) => this.map!.removeLayer(l));
    this.mapLayers[cle]?.addTo(this.map);
  }

  /** Les villes de la couche affichee, en toutes lettres : la carte a aussi son tableau. */
  villesCouche = computed<VizRow[]>(() => {
    const c = this.couches.find((x) => x.cle === this.coucheActive());
    if (!c) return [];
    return this.pts(c.champ).map((v) => ({ label: v.label, value: v.value, color: c.color }));
  });

  protected readonly nf = nf;
  protected readonly SERIES = SERIES;
  protected readonly SEQUENTIAL = SEQUENTIAL;
}
