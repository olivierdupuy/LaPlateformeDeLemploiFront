import { Component, OnInit, OnDestroy, inject, signal, ElementRef, ViewChild } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { JobOfferService } from '../../services/job-offer';
import Chart from 'chart.js/auto';
import * as L from 'leaflet';

// ── Palette app ──
const TEAL = '#0d9488';
const TEAL_400 = '#2dd4bf';
const TEAL_600 = '#0f766e';
const TEAL_50 = 'rgba(13,148,136,0.10)';
const NAVY_950 = '#020617';
const NAVY_900 = '#0f172a';
const NAVY_800 = '#1e293b';
const NAVY_700 = '#334155';
const AMBER = '#d97706';
const GREEN = '#16a34a';
const RED = '#dc2626';
const BLUE = '#2563eb';
const ORANGE = '#f97316';
const SLATE400 = '#94a3b8';
const SLATE200 = '#e2e8f0';

const MULTI = [TEAL, NAVY_800, AMBER, BLUE, GREEN, ORANGE, TEAL_400, RED, NAVY_700, SLATE400, TEAL_600, '#8b5cf6', '#ec4899'];
const STATUS_COLORS: Record<string, string> = { Pending: AMBER, Reviewed: BLUE, Accepted: GREEN, Rejected: RED };
const STATUS_LABELS: Record<string, string> = { Pending: 'En attente', Reviewed: 'Examinee', Accepted: 'Acceptee', Rejected: 'Refusee' };

// Coordonnées des principales villes françaises
const FRENCH_CITIES: Record<string, [number, number]> = {
  'paris': [48.8566, 2.3522], 'marseille': [43.2965, 5.3698], 'lyon': [45.764, 4.8357],
  'toulouse': [43.6047, 1.4442], 'nice': [43.7102, 7.262], 'nantes': [47.2184, -1.5536],
  'montpellier': [43.6108, 3.8767], 'strasbourg': [48.5734, 7.7521], 'bordeaux': [44.8378, -0.5792],
  'lille': [50.6292, 3.0573], 'rennes': [48.1173, -1.6778], 'reims': [49.2583, 3.6236],
  'saint-etienne': [45.4397, 4.3872], 'toulon': [43.1242, 5.928], 'le havre': [49.4944, 0.1079],
  'grenoble': [45.1885, 5.7245], 'dijon': [47.322, 5.0415], 'angers': [47.4784, -0.5632],
  'nimes': [43.8367, 4.3601], 'clermont-ferrand': [45.7772, 3.087],
  'le mans': [48.0061, 0.1996], 'aix-en-provence': [43.5297, 5.4474],
  'brest': [48.3904, -4.4861], 'tours': [47.3941, 0.6848], 'amiens': [49.894, 2.2958],
  'limoges': [45.8315, 1.2578], 'perpignan': [42.6887, 2.8948], 'metz': [49.1193, 6.1757],
  'besancon': [47.2378, 6.0241], 'orleans': [47.9029, 1.909], 'rouen': [49.4432, 1.0999],
  'mulhouse': [47.7508, 7.3359], 'caen': [49.1829, -0.3707], 'nancy': [48.6921, 6.1844],
  'argenteuil': [48.9472, 2.2467], 'saint-denis': [48.9362, 2.3574],
  'montreuil': [48.8638, 2.4484], 'roubaix': [50.6942, 3.1746], 'tourcoing': [50.7239, 3.1613],
  'avignon': [43.9493, 4.8055], 'dunkerque': [51.0343, 2.3768], 'valence': [44.9334, 4.8924],
  'pau': [43.2951, -0.3708], 'cannes': [43.5528, 7.0174], 'antibes': [43.5808, 7.1239],
  'calais': [50.9513, 1.8587], 'la rochelle': [46.1603, -1.1511], 'beziers': [43.3442, 3.2151],
  'colmar': [48.0794, 7.3588], 'bourges': [47.0833, 2.3964], 'quimper': [47.9976, -4.0977],
  'troyes': [48.2973, 4.0744], 'poitiers': [46.5802, 0.3404], 'ajaccio': [41.9192, 8.7386],
  'bastia': [42.6977, 9.4509], 'cherbourg': [49.6337, -1.6222], 'lorient': [47.7483, -3.3666],
  'bayonne': [43.4929, -1.4748], 'chambery': [45.5646, 5.9178], 'annecy': [45.8992, 6.1294],
  'saint-nazaire': [47.2736, -2.2137], 'niort': [46.3234, -0.4582], 'villeurbanne': [45.7667, 4.8795],
  'saint-malo': [48.6493, -2.0066], 'laval': [48.0726, -0.7686], 'vannes': [47.6583, -2.7607],
  'saint-brieuc': [48.5141, -2.7603], 'charleville-mezieres': [49.7733, 4.7203],
  'belfort': [47.6397, 6.8654], 'saint-quentin': [49.8467, 3.2875],
  'cholet': [47.0596, -0.8788], 'auxerre': [47.7981, 3.5736], 'gap': [44.5593, 6.0793],
  'boulogne-sur-mer': [50.7264, 1.6134], 'tarbes': [43.2327, 0.0782], 'albi': [43.9277, 2.148],
  'arras': [50.2921, 2.7807], 'compiegne': [49.4186, 2.826], 'chartres': [48.4561, 1.4893],
  'bourg-en-bresse': [46.2058, 5.2254], 'la roche-sur-yon': [46.6706, -1.4268],
  'chalon-sur-saone': [46.7803, 4.8536], 'macon': [46.307, 4.8286], 'angouleme': [45.6487, 0.1562],
  'agen': [44.2033, 0.6166], 'rodez': [44.3497, 2.5754], 'aurillac': [44.9261, 2.4406],
  'moulins': [46.5646, 3.3337], 'digne-les-bains': [44.0929, 6.2356], 'tulle': [45.2669, 1.7689],
  'gueret': [46.1715, 1.8706], 'mont-de-marsan': [43.8936, -0.497], 'cahors': [44.4472, 1.4406],
  'auch': [43.6465, 0.5862], 'foix': [42.9645, 1.6079], 'privas': [44.7356, 4.5987],
  'mende': [44.5177, 3.4985], 'le puy-en-velay': [45.0429, 3.8855],
  'cergy': [49.0363, 2.0761], 'evry': [48.6248, 2.4338], 'versailles': [48.8014, 2.1301],
  'boulogne-billancourt': [48.8397, 2.2399], 'nanterre': [48.8924, 2.2071],
  'creteil': [48.7906, 2.4553], 'bobigny': [48.9097, 2.4256], 'pontoise': [49.0507, 2.1006],
  'melun': [48.5395, 2.6553], 'ile-de-france': [48.8499, 2.6371], 'idf': [48.8499, 2.6371],
  'region parisienne': [48.8566, 2.3522],
};

@Component({
  selector: 'app-admin-stats',
  imports: [DecimalPipe],
  templateUrl: './admin-stats.html',
  styleUrl: './admin-stats.scss',
})
export class AdminStats implements OnInit, OnDestroy {
  private jobService = inject(JobOfferService);

  data = signal<any>(null);
  loading = signal(true);
  activeMapLayer = signal<'candidates' | 'recruiters' | 'offers'>('candidates');
  private charts: Chart[] = [];
  private map: L.Map | null = null;
  private mapLayers: Record<string, L.LayerGroup> = {};

  // Canvas refs
  @ViewChild('activityChart') activityCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('registrationsChart') registrationsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('mapContainer') mapContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('offersDayChart') offersDayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('categoryChart') categoryCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('contractChart') contractCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('experienceChart') experienceCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('locationsChart') locationsCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('salaryChart') salaryCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topCompaniesChart') topCompaniesCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('appsDayChart') appsDayCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('sourceChart') sourceCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('conversionChart') conversionCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topViewedChart') topViewedCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('interviewTypeChart') interviewTypeCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('interviewStatusChart') interviewStatusCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('messagesDayChart') messagesDayCanvas!: ElementRef<HTMLCanvasElement>;

  ngOnInit() {
    this.jobService.getAdminStats().subscribe({
      next: (d) => {
        this.data.set(d);
        this.loading.set(false);
        // Wait for Angular to render the @if block and DOM to be measured
        setTimeout(() => this.buildAllCharts(d), 150);
      },
      error: () => this.loading.set(false),
    });
  }

  ngOnDestroy() {
    this.charts.forEach(c => c.destroy());
    this.map?.remove();
  }

  private font(size = 11, weight: 'normal' | 'bold' | 500 | 600 | 700 = 500) {
    return { family: "'Satoshi', sans-serif", size, weight: weight as any };
  }

  private tooltipStyle() {
    return {
      backgroundColor: NAVY_900,
      titleFont: this.font(12, 600),
      bodyFont: this.font(11),
      padding: 10,
      cornerRadius: 8,
      borderColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
    };
  }

  private buildAllCharts(d: any) {
    if (!this.activityCanvas) {
      setTimeout(() => this.buildAllCharts(d), 60);
      return;
    }
    this.charts.forEach(c => c.destroy());
    this.charts = [];

    this.buildActivity(d);
    this.buildRegistrations(d);
    this.buildMap(d);
    this.buildOffersDay(d);
    this.buildCategory(d);
    this.buildContract(d);
    this.buildExperience(d);
    this.buildLocations(d);
    this.buildSalary(d);
    this.buildTopCompanies(d);
    this.buildStatus(d);
    this.buildAppsDay(d);
    this.buildSource(d);
    this.buildConversion(d);
    this.buildTopViewed(d);
    this.buildInterviewType(d);
    this.buildInterviewStatus(d);
    this.buildMessagesDay(d);
  }

  // ════════════════════════════════════════
  //  1. ACTIVITE GLOBALE (ligne multi)
  // ════════════════════════════════════════
  private buildActivity(d: any) {
    const labels = d.activityTimeline.map((i: any) => i.label);
    this.charts.push(new Chart(this.activityCanvas.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          { label: 'Offres', data: d.activityTimeline.map((i: any) => i.offres), borderColor: TEAL, backgroundColor: TEAL_50, fill: true, tension: 0.4, pointRadius: 2 },
          { label: 'Candidatures', data: d.activityTimeline.map((i: any) => i.candidatures), borderColor: BLUE, backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.4, pointRadius: 2 },
          { label: 'Inscriptions', data: d.activityTimeline.map((i: any) => i.inscriptions), borderColor: AMBER, backgroundColor: 'rgba(217,119,6,0.08)', fill: true, tension: 0.4, pointRadius: 2 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { usePointStyle: true, pointStyle: 'circle', font: this.font(11, 500), color: NAVY_800, padding: 16 } }, tooltip: this.tooltipStyle() },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(10), color: SLATE400, maxRotation: 0 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
        },
        interaction: { intersect: false, mode: 'index' },
        animation: { duration: 800, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  2. INSCRIPTIONS PAR JOUR
  // ════════════════════════════════════════
  private buildRegistrations(d: any) {
    this.charts.push(new Chart(this.registrationsCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: d.registrationsByDay.map((i: any) => i.label),
        datasets: [{ data: d.registrationsByDay.map((i: any) => i.value), backgroundColor: TEAL, borderRadius: 4, barPercentage: 0.7 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(10), color: SLATE400, maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  3. CARTE DE FRANCE INTERACTIVE
  // ════════════════════════════════════════
  private buildMap(d: any) {
    if (!this.mapContainer?.nativeElement) return;

    // Destroy previous instance if any
    if (this.map) {
      this.map.remove();
      this.map = null;
    }

    const el = this.mapContainer.nativeElement;

    // Wait until container actually has dimensions
    if (el.clientHeight === 0) {
      setTimeout(() => this.buildMap(d), 100);
      return;
    }

    // Fix Leaflet default marker icon path (Webpack breaks it)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'assets/marker-icon-2x.png',
      iconUrl: 'assets/marker-icon.png',
      shadowUrl: 'assets/marker-shadow.png',
    });

    this.map = L.map(el, {
      center: [46.6, 2.5],
      zoom: 6,
      zoomControl: true,
      scrollWheelZoom: true,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(this.map);

    L.control.attribution({ position: 'bottomright', prefix: false })
      .addAttribution('&copy; <a href="https://carto.com/">CARTO</a>')
      .addTo(this.map);

    // Build layers
    this.mapLayers['candidates'] = this.createCityLayer(d.candidatesByCity || [], TEAL, 'candidat');
    this.mapLayers['recruiters'] = this.createCityLayer(d.recruitersByCity || [], BLUE, 'recruteur');
    this.mapLayers['offers'] = this.createCityLayer(d.offersByLocation || [], ORANGE, 'offre');

    // Show default layer
    this.mapLayers['candidates'].addTo(this.map);

    // Multiple invalidateSize calls to handle CSS animations/transitions
    const map = this.map;
    setTimeout(() => map.invalidateSize(), 150);
    setTimeout(() => map.invalidateSize(), 400);
    setTimeout(() => map.invalidateSize(), 800);
  }

  private createCityLayer(items: { label: string; value: number }[], color: string, noun: string): L.LayerGroup {
    const group = L.layerGroup();
    const maxVal = Math.max(...items.map(i => i.value), 1);

    for (const item of items) {
      const coords = this.findCity(item.label);
      if (!coords) continue;

      const radius = 8 + (item.value / maxVal) * 30;
      const circle = L.circleMarker(coords, {
        radius,
        fillColor: color,
        fillOpacity: 0.55,
        color: color,
        weight: 2,
        opacity: 0.85,
      });

      circle.bindPopup(
        `<div style="font-family:'Satoshi',sans-serif;text-align:center;padding:4px">` +
        `<strong style="font-size:14px;color:${NAVY_800}">${item.label}</strong><br>` +
        `<span style="font-size:22px;font-weight:800;color:${color}">${item.value}</span><br>` +
        `<span style="font-size:11px;color:${SLATE400}">${noun}${item.value > 1 ? 's' : ''}</span></div>`,
        { closeButton: false, className: 'map-popup' }
      );

      circle.on('mouseover', () => circle.openPopup());
      circle.on('mouseout', () => circle.closePopup());

      group.addLayer(circle);
    }
    return group;
  }

  private findCity(name: string): [number, number] | null {
    const normalized = name.toLowerCase().trim()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
    // Direct match
    if (FRENCH_CITIES[normalized]) return FRENCH_CITIES[normalized];
    // Try without dashes
    const noDash = normalized.replace(/-/g, ' ');
    for (const [key, coords] of Object.entries(FRENCH_CITIES)) {
      if (key.replace(/-/g, ' ') === noDash) return coords;
    }
    // Partial match
    for (const [key, coords] of Object.entries(FRENCH_CITIES)) {
      if (key.includes(normalized) || normalized.includes(key)) return coords;
    }
    return null;
  }

  switchMapLayer(layer: 'candidates' | 'recruiters' | 'offers') {
    if (!this.map) return;
    // Remove all layers
    Object.values(this.mapLayers).forEach(l => this.map!.removeLayer(l));
    // Add selected
    this.mapLayers[layer]?.addTo(this.map);
    this.activeMapLayer.set(layer);
  }

  // ════════════════════════════════════════
  //  4. OFFRES PAR JOUR
  // ════════════════════════════════════════
  private buildOffersDay(d: any) {
    this.charts.push(new Chart(this.offersDayCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: d.offersByDay.map((i: any) => i.label),
        datasets: [{
          data: d.offersByDay.map((i: any) => i.value),
          borderColor: TEAL, backgroundColor: TEAL_50, fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: TEAL,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(10), color: SLATE400, maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  5. OFFRES PAR CATEGORIE
  // ════════════════════════════════════════
  private buildCategory(d: any) {
    const items = d.offersByCategory || [];
    this.charts.push(new Chart(this.categoryCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: MULTI.slice(0, items.length), borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: this.font(11, 500), color: NAVY_800 } },
          tooltip: this.tooltipStyle(),
        },
        animation: { duration: 800, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  6. TYPES DE CONTRAT
  // ════════════════════════════════════════
  private buildContract(d: any) {
    const items = d.offersByContract || [];
    this.charts.push(new Chart(this.contractCanvas.nativeElement, {
      type: 'polarArea',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: MULTI.slice(0, items.length).map(c => c + '44'), borderColor: MULTI.slice(0, items.length), borderWidth: 2 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: this.font(11, 500), color: NAVY_800 } }, tooltip: this.tooltipStyle() },
        scales: { r: { ticks: { display: false }, grid: { color: SLATE200 } } },
        animation: { duration: 800, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  7. EXPERIENCE REQUISE
  // ════════════════════════════════════════
  private buildExperience(d: any) {
    const items = d.offersByExperience || [];
    if (!items.length) return;
    this.charts.push(new Chart(this.experienceCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: [TEAL, TEAL_400, NAVY_800, AMBER, RED], borderRadius: 6, barPercentage: 0.6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(11, 600), color: NAVY_800 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  8. GEOGRAPHIE DES OFFRES
  // ════════════════════════════════════════
  private buildLocations(d: any) {
    const items = d.offersByLocation || [];
    if (!items.length) return;
    const ctx = this.locationsCanvas.nativeElement.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    grad.addColorStop(0, TEAL_600);
    grad.addColorStop(1, TEAL_400);
    this.charts.push(new Chart(ctx, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: grad, borderRadius: 5, borderSkipped: false, barPercentage: 0.65 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...this.tooltipStyle(), callbacks: { label: (ctx: any) => `${ctx.parsed.x} offre${ctx.parsed.x > 1 ? 's' : ''}` } } },
        scales: {
          x: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
          y: { grid: { display: false }, ticks: { font: this.font(11, 600), color: NAVY_800 } },
        },
        animation: { duration: 800, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  9. SALAIRES MOYENS PAR CATEGORIE
  // ════════════════════════════════════════
  private buildSalary(d: any) {
    const items = d.salaryByCategory || [];
    if (!items.length) return;
    this.charts.push(new Chart(this.salaryCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [
          { label: 'Min', data: items.map((i: any) => i.min), backgroundColor: TEAL_400 + '88', borderColor: TEAL_400, borderWidth: 1, borderRadius: 4, barPercentage: 0.7 },
          { label: 'Max', data: items.map((i: any) => i.max), backgroundColor: NAVY_800 + '88', borderColor: NAVY_800, borderWidth: 1, borderRadius: 4, barPercentage: 0.7 },
        ],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { usePointStyle: true, pointStyle: 'circle', font: this.font(11, 500), color: NAVY_800, padding: 16 } },
          tooltip: { ...this.tooltipStyle(), callbacks: { label: (ctx: any) => ` ${ctx.dataset.label}: ${(ctx.parsed.y / 1000).toFixed(0)}k EUR/an` } },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(10), color: SLATE400, maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, callback: (v: any) => (v / 1000) + 'k' } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  10. TOP ENTREPRISES
  // ════════════════════════════════════════
  private buildTopCompanies(d: any) {
    const items = d.topCompanies || [];
    const ctx = this.topCompaniesCanvas.nativeElement.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, ctx.canvas.width, 0);
    grad.addColorStop(0, NAVY_800);
    grad.addColorStop(1, TEAL);
    this.charts.push(new Chart(ctx, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: grad, borderRadius: 5, borderSkipped: false, barPercentage: 0.65 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
          y: { grid: { display: false }, ticks: { font: this.font(11, 600), color: NAVY_800 } },
        },
        animation: { duration: 800, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  11. CANDIDATURES PAR STATUT
  // ════════════════════════════════════════
  private buildStatus(d: any) {
    const items = d.appsByStatus || [];
    const total = items.reduce((s: number, i: any) => s + i.value, 0);
    this.charts.push(new Chart(this.statusCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: items.map((i: any) => STATUS_LABELS[i.label] || i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: items.map((i: any) => STATUS_COLORS[i.label] || SLATE400), borderWidth: 3, borderColor: '#fff', hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: this.font(11, 500), color: NAVY_800 } },
          tooltip: { ...this.tooltipStyle(), callbacks: { label: (ctx: any) => { const pct = total ? Math.round(ctx.parsed / total * 100) : 0; return ` ${ctx.label}: ${ctx.parsed} (${pct}%)`; } } },
        },
        animation: { duration: 900, easing: 'easeOutQuart' },
      },
      plugins: [{
        id: 'centerText',
        afterDraw: (chart: any) => {
          const { ctx: c, chartArea } = chart;
          const cx = (chartArea.left + chartArea.right) / 2;
          const cy = (chartArea.top + chartArea.bottom) / 2;
          c.save();
          c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = "800 1.4rem 'Satoshi', sans-serif"; c.fillStyle = NAVY_800;
          c.fillText(String(total), cx, cy - 7);
          c.font = "500 0.7rem 'Satoshi', sans-serif"; c.fillStyle = SLATE400;
          c.fillText('Total', cx, cy + 13);
          c.restore();
        }
      }],
    }));
  }

  // ════════════════════════════════════════
  //  12. CANDIDATURES PAR JOUR
  // ════════════════════════════════════════
  private buildAppsDay(d: any) {
    this.charts.push(new Chart(this.appsDayCanvas.nativeElement, {
      type: 'line',
      data: {
        labels: d.appsByDay.map((i: any) => i.label),
        datasets: [{
          data: d.appsByDay.map((i: any) => i.value),
          borderColor: BLUE, backgroundColor: 'rgba(37,99,235,0.08)', fill: true, tension: 0.4, pointRadius: 3, pointBackgroundColor: BLUE,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(10), color: SLATE400, maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  13. SOURCE DES CANDIDATURES
  // ════════════════════════════════════════
  private buildSource(d: any) {
    const items = d.appsBySource || [];
    if (!items.length) return;
    this.charts.push(new Chart(this.sourceCanvas.nativeElement, {
      type: 'pie',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: MULTI.slice(0, items.length), borderWidth: 2, borderColor: '#fff' }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { usePointStyle: true, pointStyle: 'circle', padding: 12, font: this.font(11, 500), color: NAVY_800 } },
          tooltip: this.tooltipStyle(),
        },
        animation: { duration: 800, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  14. TAUX DE CONVERSION
  // ════════════════════════════════════════
  private buildConversion(d: any) {
    const items = d.conversionByCompany || [];
    if (!items.length) return;
    this.charts.push(new Chart(this.conversionCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: GREEN + 'cc', borderColor: GREEN, borderWidth: 1, borderRadius: 5, barPercentage: 0.6 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...this.tooltipStyle(), callbacks: { label: (ctx: any) => ` Conversion: ${ctx.parsed.x}%` } } },
        scales: {
          x: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, callback: (v: any) => v + '%' } },
          y: { grid: { display: false }, ticks: { font: this.font(11, 600), color: NAVY_800 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  15. TOP OFFRES LES PLUS VUES
  // ════════════════════════════════════════
  private buildTopViewed(d: any) {
    const items = d.topViewedOffers || [];
    if (!items.length) return;
    this.charts.push(new Chart(this.topViewedCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: ORANGE + 'cc', borderColor: ORANGE, borderWidth: 1, borderRadius: 5, barPercentage: 0.65 }],
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...this.tooltipStyle(), callbacks: { label: (ctx: any) => ` ${ctx.parsed.x} vues — ${items[ctx.dataIndex].company}` } } },
        scales: {
          x: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400 } },
          y: { grid: { display: false }, ticks: { font: this.font(10, 600), color: NAVY_800 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  16. ENTRETIENS PAR TYPE
  // ════════════════════════════════════════
  private buildInterviewType(d: any) {
    const items = d.interviewsByType || [];
    if (!items.length) return;
    this.charts.push(new Chart(this.interviewTypeCanvas.nativeElement, {
      type: 'doughnut',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: [TEAL, BLUE, AMBER, NAVY_800], borderWidth: 2, borderColor: '#fff', hoverOffset: 6 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '55%',
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, pointStyle: 'circle', padding: 14, font: this.font(11, 500), color: NAVY_800 } }, tooltip: this.tooltipStyle() },
        animation: { duration: 800, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  17. ENTRETIENS PAR STATUT
  // ════════════════════════════════════════
  private buildInterviewStatus(d: any) {
    const items = d.interviewsByStatus || [];
    if (!items.length) return;
    const colors: Record<string, string> = { Proposed: AMBER, Accepted: GREEN, Completed: TEAL, Cancelled: RED };
    this.charts.push(new Chart(this.interviewStatusCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: items.map((i: any) => colors[i.label] || SLATE400), borderRadius: 6, barPercentage: 0.55 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(11, 600), color: NAVY_800 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }

  // ════════════════════════════════════════
  //  18. MESSAGES PAR JOUR
  // ════════════════════════════════════════
  private buildMessagesDay(d: any) {
    const items = d.messagesByDay || [];
    if (!items.length) return;
    this.charts.push(new Chart(this.messagesDayCanvas.nativeElement, {
      type: 'bar',
      data: {
        labels: items.map((i: any) => i.label),
        datasets: [{ data: items.map((i: any) => i.value), backgroundColor: NAVY_800 + 'cc', borderRadius: 3, barPercentage: 0.7 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: this.tooltipStyle() },
        scales: {
          x: { grid: { display: false }, ticks: { font: this.font(10), color: SLATE400, maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: SLATE200 }, ticks: { font: this.font(10), color: SLATE400, stepSize: 1 } },
        },
        animation: { duration: 700, easing: 'easeOutQuart' },
      },
    }));
  }
}
