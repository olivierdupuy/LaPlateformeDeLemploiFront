import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { JobOfferService } from '../../services/job-offer';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';
import { PlateformeProService, DestinationDiffusion, Diffusion } from '../../services/plateforme-pro.service';
import { JobOffer } from '../../models/job-offer.model';
import { companyColor, getContractBadgeClass } from '../../utils/job.utils';
import { ToastrService } from 'ngx-toastr';
import { ConsoleShell } from '../console-shell/console-shell';
import { Explication } from '../explication/explication';
import { libelleStatut } from '../../utils/statut-candidature';

@Component({
  selector: 'app-my-offers',
  imports: [RouterLink, DatePipe, FormsModule, ConsoleShell, Explication],
  templateUrl: './my-offers.html',
  styleUrl: './my-offers.scss',
})
export class MyOffers implements OnInit {
  private jobService = inject(JobOfferService);
  private recruiterService = inject(RecruiterFeaturesService);
  private pro = inject(PlateformeProService);
  private router = inject(Router);
  private toastr = inject(ToastrService);
  companyColor = companyColor;
  getContractBadgeClass = getContractBadgeClass;

  offers = signal<JobOffer[]>([]);
  loading = signal(true);
  filter = signal<'all' | 'active' | 'expired' | 'pending' | 'rejected' | 'draft'>('all');
  scope = signal<'mine' | 'team'>('mine');
  team = signal<{ company: string | null; members: { name: string; role: string; isMe: boolean; offerCount: number }[] }>({ company: null, members: [] });

  // Sponsorisation + stats
  statsOpenId = signal<number | null>(null);
  statsData = signal<any>(null);
  statsLoading = signal(false);

  // Un brouillon est inactif par construction : sans cette exclusion, il serait
  // compte parmi les offres expirees.
  private isExpired = (o: JobOffer) =>
    !o.isDraft && !o.isActive && o.moderationStatus !== 'Pending' && o.moderationStatus !== 'Rejected';

  /* ── Recherche et tri ──
     Le filtre par statut suffit tant qu'on a trois offres. Un recruteur
     qui en a quarante cherche « le poste de comptable » ou veut voir
     lesquelles ne recoivent rien : ni l'un ni l'autre n'etait possible. */
  query = signal('');
  sort = signal<'recent' | 'apps' | 'views' | 'title' | 'location'>('recent');

  /* ── Sélection multiple ──
     Elle existait sur les candidatures et pas sur les offres, alors que
     c'est là qu'on en a le plus besoin : une campagne se suspend en une
     fois, pas annonce par annonce. */
  selection = signal<Set<number>>(new Set());

  /* ── Étiquettes ──
     Du vocabulaire interne, pour s'y retrouver à quarante offres. Elles
     viennent d'un appel séparé : le catalogue public rend l'offre
     entière, et une étiquette n'a rien à y faire. */
  /* ── Rôles de l'équipe ──
     Le partage était binaire : déclarer la même entreprise suffisait à
     pouvoir modifier et supprimer les offres de tout le monde. Un membre
     voit désormais tout et n'écrit que sur le sien ; savoir à qui
     s'adresser fait partie du réglage. */
  equipeRoles = signal<{ id: string; nom: string; role: string; moi: boolean }[]>([]);
  jeSuisProprietaire = signal(false);
  rolesOuverts = signal(false);

  chargerEquipe() {
    this.recruiterService.equipe().subscribe({
      next: (e) => {
        this.equipeRoles.set(e.membres);
        this.jeSuisProprietaire.set(e.jeSuisProprietaire);
      },
      error: () => {},
    });
  }

  basculerRole(m: { id: string; role: string }) {
    const vers = m.role === 'proprietaire' ? 'membre' : 'proprietaire';
    this.recruiterService.changerRoleEquipe(m.id, vers).subscribe({
      next: () => {
        this.equipeRoles.update((l) => l.map((x) => (x.id === m.id ? { ...x, role: vers } : x)));
        this.toastr.success(vers === 'proprietaire' ? 'Promu propriétaire' : 'Redevenu membre');
      },
      error: (e) => this.toastr.error(e?.error?.message ?? "Le rôle n'a pas pu être changé"),
    });
  }

  etiquettes = signal<Record<string, string[]>>({});
  vocabulaire = signal<string[]>([]);
  etiquetteFiltre = signal('');
  /** L'offre dont on modifie les étiquettes, et la saisie en cours. */
  etiquetteOuverte = signal<number | null>(null);
  saisieEtiquette = '';
  enMasse = signal(false);

  private byStatus(f: string): JobOffer[] {
    if (f === 'active') return this.offers().filter(o => o.isActive && o.moderationStatus === 'Approved');
    if (f === 'suspendue') return this.offers().filter(o => o.etatPublication === 'suspendue');
    if (f === 'expired') return this.offers().filter(this.isExpired);
    if (f === 'pending') return this.offers().filter(o => !o.isDraft && o.moderationStatus === 'Pending');
    if (f === 'rejected') return this.offers().filter(o => o.moderationStatus === 'Rejected');
    if (f === 'draft') return this.offers().filter(o => o.isDraft);
    return this.offers();
  }

  filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    const s = this.sort();

    const etq = this.etiquetteFiltre().toLowerCase();

    const list = this.byStatus(this.filter()).filter((o) => {
      if (etq && !this.etiquettesDe(o.id).some((m) => m.toLowerCase() === etq)) return false;
      if (!q) return true;
      return `${o.title} ${o.location ?? ''} ${o.contractType ?? ''}`.toLowerCase().includes(q);
    });

    return [...list].sort((a, b) => {
      switch (s) {
        case 'apps': return (b.applications?.length || 0) - (a.applications?.length || 0);
        case 'views': return (b.viewCount || 0) - (a.viewCount || 0);
        case 'title': return a.title.localeCompare(b.title, 'fr');
        // « localeCompare » en français : sans lui, « Épinal » se range
        // après « Zurich ». Les offres sans lieu ferment la liste plutôt
        // que de l'ouvrir — une valeur vide n'est pas un lieu qui commence
        // par rien.
        case 'location': return (a.location || '￿').localeCompare(b.location || '￿', 'fr');
        default: return +new Date(b.createdAt) - +new Date(a.createdAt);
      }
    });
  });

  /**
   * Part des visiteurs qui postulent, offre par offre.
   *
   * La carte affichait « 3 vues » et « 1 candidature » cote a cote sans
   * jamais les rapporter l'une a l'autre. C'est pourtant le seul chiffre
   * qui distingue une offre qu'on ne voit pas d'une offre qu'on voit et
   * qui ne donne pas envie — et les deux se corrigent differemment.
   */
  conversion(o: JobOffer): number | null {
    const vues = o.viewCount || 0;
    if (vues < 5) return null; // sous cinq vues, un taux n'a pas de sens
    return Math.round(((o.applications?.length || 0) / vues) * 100);
  }

  counts = computed(() => ({
    total: this.offers().length,
    active: this.offers().filter(o => o.isActive && o.moderationStatus === 'Approved').length,
    expired: this.offers().filter(this.isExpired).length,
    pending: this.offers().filter(o => !o.isDraft && o.moderationStatus === 'Pending').length,
    rejected: this.offers().filter(o => o.moderationStatus === 'Rejected').length,
    drafts: this.offers().filter(o => o.isDraft).length,
    totalApps: this.offers().reduce((s, o) => s + (o.applications?.length || 0), 0),
  }));

  /** Ou mene la carte : un brouillon n'a pas de page publique, il se reprend. */
  cardLink(o: JobOffer): (string | number)[] | null {
    if (o.isDraft) return ['/recruteur/offres', o.id, 'modifier'];
    return o.moderationStatus === 'Approved' ? ['/offres', o.id] : null;
  }

  ngOnInit() {
    this.loadOffers();
    this.chargerEtiquettes();
    this.chargerEquipe();
    this.jobService.getTeamMembers().subscribe((t) => this.team.set(t));
  }

  loadOffers() {
    this.loading.set(true);
    this.jobService.getMyOffers(this.scope() === 'team' ? 'team' : undefined)
      .subscribe((o) => { this.offers.set(o); this.loading.set(false); });
  }
  setScope(s: 'mine' | 'team') { this.scope.set(s); this.loadOffers(); }

  getDaysLeft(expiresAt?: string): number | null {
    if (!expiresAt) return null;
    return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  }

  /**
   * La carte entière est un lien vers l'offre, et elle contient des
   * boutons. Chacun d'eux arrête déjà la propagation ; ce qui restait
   * à traiter, ce sont les gouttières — l'espace entre deux boutons,
   * le fond du panneau de statistiques. Un clic qui tombe là suivait
   * le lien, et on quittait la page en croyant avoir cliqué à côté.
   *
   * C'était le rôle de deux `(click)` posés sur des `div` pour ne rien
   * faire d'autre que s'annuler. Le lien porte désormais lui-même la
   * question : « ce clic est-il tombé dans une zone d'action ? »
   */
  auClicCarte(evenement: Event) {
    const cible = evenement.target as HTMLElement | null;
    if (cible?.closest('.oc-actions, .oc-stats-panel, .oc-diff, .oc-etq, .oc-etq-saisie')) {
      evenement.preventDefault();
      evenement.stopPropagation();
    }
  }

  basculerChoix(id: number, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.selection.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  estChoisie = (id: number) => this.selection().has(id);

  etiquettesDe = (id: number): string[] => this.etiquettes()[String(id)] ?? [];

  chargerEtiquettes() {
    this.jobService.etiquettes().subscribe({
      next: (r) => { this.etiquettes.set(r.parOffre); this.vocabulaire.set(r.vocabulaire); },
      error: () => {},
    });
  }

  ouvrirEtiquettes(id: number, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.saisieEtiquette = '';
    this.etiquetteOuverte.update((v) => (v === id ? null : id));
  }

  /** Poser un mot de plus, ou en retirer un : la liste entière repart. */
  private enregistrerEtiquettes(id: number, mots: string[]) {
    this.jobService.poserEtiquettes(id, mots).subscribe({
      next: (r) => {
        this.etiquettes.update((m) => ({ ...m, [String(id)]: r.etiquettes }));
        this.chargerEtiquettes();
      },
      error: (e) => this.toastr.error(e?.error?.message ?? "L'étiquette n'a pas pu être posée"),
    });
  }

  ajouterEtiquette(id: number) {
    const mot = this.saisieEtiquette.trim();
    if (!mot) return;
    const deja = this.etiquettesDe(id);
    // Le serveur replie la casse, mais refuser ici évite un aller-retour
    // pour rien et un clignotement de la liste.
    if (deja.some((m) => m.toLowerCase() === mot.toLowerCase())) { this.saisieEtiquette = ''; return; }
    this.saisieEtiquette = '';
    this.enregistrerEtiquettes(id, [...deja, mot]);
  }

  retirerEtiquette(id: number, mot: string, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.enregistrerEtiquettes(id, this.etiquettesDe(id).filter((m) => m !== mot));
  }
  toutChoisir() { this.selection.set(new Set(this.filtered().map((o) => o.id))); }
  toutDeselectionner() { this.selection.set(new Set()); }

  /**
   * Le même état posé sur toute la sélection.
   *
   * Le serveur rend trois nombres : ce qu'il a traité, ce qu'il a écarté
   * — brouillons et offres en modération, qui n'ont pas d'état de
   * publication — et ce qu'on lui a demandé. On les dit tous les trois :
   * annoncer « 12 offres suspendues » quand trois l'ont été et neuf
   * ignorées est précisément ce qu'on vient de corriger côté serveur.
   */
  appliquerEnMasse(etat: 'ouverte' | 'suspendue' | 'fermee') {
    const ids = Array.from(this.selection());
    if (!ids.length) return;
    this.jobService.changerEtatEnMasse(ids, etat).subscribe({
      next: (r) => {
        const mot = etat === 'ouverte' ? 'rouverte' : etat === 'suspendue' ? 'suspendue' : 'fermée';
        this.toastr.success(
          r.ignorees
            ? `${r.updated} offre${r.updated > 1 ? 's' : ''} ${mot}${r.updated > 1 ? 's' : ''}, ${r.ignorees} écartée${r.ignorees > 1 ? 's' : ''} (brouillon ou modération)`
            : `${r.updated} offre${r.updated > 1 ? 's' : ''} ${mot}${r.updated > 1 ? 's' : ''}`,
        );
        this.selection.set(new Set());
        this.enMasse.set(false);
        this.loadOffers();
      },
      error: (e) => this.toastr.error(e?.error?.message ?? "L'action groupée a échoué"),
    });
  }

  /**
   * Suspendre une offre, ou la rouvrir.
   *
   * Le seul geste disponible pour retirer une annonce etait la
   * suppression, qui emporte les candidatures deja recues. Un arbitrage
   * qui dure une semaine ne doit pas couter les dossiers du mois.
   */
  basculerSuspension(offer: JobOffer, event: Event) {
    event.stopPropagation();
    const versSuspendue = offer.etatPublication !== 'suspendue';
    this.jobService.changerEtat(offer.id, versSuspendue ? 'suspendue' : 'ouverte').subscribe({
      next: (r) => {
        this.offers.update((list) =>
          list.map((o) => (o.id === offer.id ? { ...o, etatPublication: r.etatPublication, isActive: r.isActive } : o)),
        );
        this.toastr.success(versSuspendue ? 'Offre suspendue' : 'Offre rouverte');
      },
      error: (e) => this.toastr.error(e?.error?.message ?? "L'état n'a pas pu être changé"),
    });
  }

  renew(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.jobService.renewOffer(offer.id).subscribe({
      next: () => { this.toastr.success('Offre renouvelee pour 30 jours'); this.ngOnInit(); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  stripeColor(type: string): string {
    return { CDI: 'var(--brand)', CDD: 'var(--amber)', Stage: 'var(--blue)', Freelance: 'var(--red)', Alternance: 'var(--purple)' }[type] || 'var(--brand)';
  }

  moderationLabel(status?: string): string {
    return { Pending: 'En attente de validation', Approved: 'Approuvee', Rejected: 'Rejetee' }[status || ''] || '';
  }

  /**
   * Mettre une offre en avant.
   *
   * Ce bouton appelait `toggleFeature`, qui met en avant sans rien
   * décompter et sans date de fin. La mise en avant était donc gratuite,
   * illimitée et éternelle — le seul levier économique du site, offert.
   * Et comme tout le monde pouvait s'en servir, il ne distinguait plus
   * rien : quand toutes les offres sont mises en avant, aucune ne l'est.
   *
   * Il passe désormais par la facturation, qui décide :
   *
   *   le quota de la formule la couvre → c'est fait, pour quinze jours ;
   *   le quota est épuisé, un prestataire est branché → on ouvre le
   *     tunnel de paiement ;
   *   le quota est épuisé, aucun prestataire → on le dit franchement et
   *     on renvoie vers la page qui explique les formules.
   *
   * Le retrait reste sur l'ancien point d'entrée : cesser une mise en
   * avant qu'on a payée est un droit, pas un achat.
   */
  sponsor(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();

    if (offer.isFeatured) {
      this.jobService.toggleFeature(offer.id).subscribe({
        next: (r) => {
          offer.isFeatured = r.isFeatured;
          this.toastr.info('Mise en avant retirée.');
        },
        error: () => this.toastr.error("Le retrait n'a pas abouti."),
      });
      return;
    }

    this.pro.acheterMiseEnAvant(offer.id).subscribe({
      next: (r) => {
        if (r.redirection) {
          location.href = r.redirection;
          return;
        }
        offer.isFeatured = true;
        this.toastr.success(r.message ?? 'Offre mise en avant.');
      },
      error: (e) => {
        // 503 : le quota est épuisé et le paiement n'est pas ouvert.
        // Ce n'est pas une panne, c'est une limite — et le recruteur
        // doit savoir où aller, pas recevoir « Erreur ».
        const message = e?.error?.message ?? "La mise en avant n'a pas abouti.";
        this.toastr.info(message, '', { timeOut: 9000 });
        if (e?.status === 503 || e?.status === 402) {
          this.router.navigate(['/recruteur/facturation']);
        }
      },
    });
  }

  toggleStats(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.statsOpenId() === offer.id) { this.statsOpenId.set(null); return; }
    this.statsOpenId.set(offer.id);
    this.statsData.set(null);
    this.statsLoading.set(true);
    this.jobService.getOfferStats(offer.id).subscribe({
      next: (s) => { this.statsData.set(s); this.statsLoading.set(false); },
      error: () => { this.statsLoading.set(false); this.toastr.error('Erreur stats'); },
    });
  }

  statusLabel(status: string): string {
    return libelleStatut(status);
  }

  // ══════════════════════════════════════
  //  Multidiffusion
  // ══════════════════════════════════════
  //
  // Un recruteur redépose son offre chez France Travail puis chez deux
  // agrégateurs, à la main, en recopiant le même texte. Puis il pourvoit
  // le poste et en oublie la moitié : les candidatures continuent
  // d'arriver pendant des semaines sur un poste fermé, et chacune est
  // quelqu'un qui attend une réponse.
  //
  // Le panneau est replié par défaut et ne charge rien avant d'être
  // ouvert : la liste d'offres est déjà lourde, et la plupart des
  // recruteurs ne diffuseront jamais ailleurs.

  destinations = signal<DestinationDiffusion[]>([]);
  diffusionOpenId = signal<number | null>(null);
  diffusions = signal<Diffusion[]>([]);
  diffusionLoading = signal(false);
  diffusionEnCours = signal<string | null>(null);

  toggleDiffusion(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    if (this.diffusionOpenId() === offer.id) { this.diffusionOpenId.set(null); return; }

    this.diffusionOpenId.set(offer.id);
    this.diffusions.set([]);
    this.diffusionLoading.set(true);

    if (!this.destinations().length) {
      this.pro.destinationsDiffusion().subscribe({
        next: (r) => this.destinations.set(r.destinations),
        error: () => this.destinations.set([]),
      });
    }

    this.pro.suiviDiffusion(offer.id).subscribe({
      next: (d) => { this.diffusions.set(d); this.diffusionLoading.set(false); },
      error: () => { this.diffusionLoading.set(false); this.toastr.error('Suivi de diffusion indisponible.'); },
    });
  }

  /** L'état de cette offre chez ce partenaire, s'il y en a un. */
  etatChez(cle: string): Diffusion | undefined {
    return this.diffusions().find((d) => d.destination === cle);
  }

  diffuser(offreId: number, destination: string) {
    this.diffusionEnCours.set(destination);
    this.pro.diffuser(offreId, destination).subscribe({
      next: (d) => {
        this.diffusionEnCours.set(null);
        this.remplacerSuivi(d);
        // L'échec est une réponse, pas une erreur : le serveur rend 200
        // avec son motif, et c'est ce motif que le recruteur doit lire.
        // Un « erreur » générique lui apprendrait qu'il s'est passé
        // quelque chose, sans lui dire quoi faire.
        if (d.statut === 'diffusee') this.toastr.success('Offre diffusée.');
        else this.toastr.warning(d.motif || 'La diffusion n’a pas abouti.', 'Non diffusée');
      },
      error: () => {
        this.diffusionEnCours.set(null);
        this.toastr.error('La demande de diffusion n’est pas passée.');
      },
    });
  }

  retirer(offreId: number, destination: string) {
    this.diffusionEnCours.set(destination);
    this.pro.retirerDiffusion(offreId, destination).subscribe({
      next: (d) => {
        this.diffusionEnCours.set(null);
        this.remplacerSuivi(d);
        if (d.statut === 'retiree') this.toastr.success('Offre retirée du partenaire.');
        else this.toastr.error(d.motif || 'Le retrait n’a pas abouti.', 'Toujours en ligne');
      },
      error: () => {
        this.diffusionEnCours.set(null);
        this.toastr.error('La demande de retrait n’est pas passée.');
      },
    });
  }

  private remplacerSuivi(d: Diffusion) {
    this.diffusions.update((liste) => {
      const i = liste.findIndex((x) => x.destination === d.destination);
      if (i < 0) return [...liste, d];
      const copie = [...liste];
      copie[i] = d;
      return copie;
    });
  }

  libelleStatutDiffusion(statut: string): string {
    return {
      en_attente: 'En attente',
      diffusee: 'En ligne',
      echec: 'Échec',
      retiree: 'Retirée',
    }[statut] || statut;
  }

  duplicate(offer: JobOffer, event: Event) {
    event.stopPropagation();
    event.preventDefault();
    this.recruiterService.duplicateOffer(offer.id).subscribe({
      next: (dup) => {
        this.toastr.success('Offre dupliquée');
        this.router.navigate(['/recruteur/offres', dup.id, 'modifier']);
      },
      error: () => this.toastr.error('Erreur'),
    });
  }
}
