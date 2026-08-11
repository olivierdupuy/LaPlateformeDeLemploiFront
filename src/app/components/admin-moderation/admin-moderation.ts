import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe, SlicePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../services/admin.service';
import { JobOfferService } from '../../services/job-offer';
import { JobReport } from '../../models/job-offer.model';
import { CompanyReviewService } from '../../services/company-review.service';
import {
  PlateformeProService,
  SignalementAdmin,
  RetourCourriel,
} from '../../services/plateforme-pro.service';
import { ToastrService } from 'ngx-toastr';
import { confirmer } from '../../utils/confirmation';

@Component({
  selector: 'app-admin-moderation',
  imports: [DatePipe, SlicePipe, FormsModule, RouterLink],
  templateUrl: './admin-moderation.html',
  styleUrl: './admin-moderation.scss',
})
export class AdminModeration implements OnInit {
  private admin = inject(AdminService);
  private jobService = inject(JobOfferService);
  private reviewSvc = inject(CompanyReviewService);
  private pro = inject(PlateformeProService);
  private toastr = inject(ToastrService);

  offers = signal<any[]>([]);
  reports = signal<JobReport[]>([]);
  companyReviews = signal<any[]>([]);
  loading = signal(true);
  activeTab = signal<string>('Pending');
  rejectNote = '';
  rejectingId = signal<number | null>(null);

  // ── Signalements au titre du règlement européen ──
  //
  // Le mécanisme de dépôt existait, avec son accusé de réception et sa
  // référence de suivi. Rien ne permettait de les **instruire** : les
  // dossiers s'accumulaient dans une table que personne ne regardait,
  // alors que le texte impose une décision motivée. Un mécanisme de
  // signalement dont aucune décision ne sort n'est pas un mécanisme de
  // signalement — c'est une boîte aux lettres avec un accusé.
  dsa = signal<SignalementAdmin[]>([]);
  dsaFiltre = signal<string>('Recu');
  dsaOuvert = signal<number | null>(null);
  dsaDecision = { statut: 'Fonde', decision: '', mesurePrise: 'Aucune' };

  /** Les adresses qu'on a cessé de servir, et pourquoi. */
  retours = signal<RetourCourriel[]>([]);

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    if (this.activeTab() === 'Reviews') {
      this.reviewSvc.getAllReviewsAdmin().subscribe(r => { this.companyReviews.set(r); this.loading.set(false); });
    } else if (this.activeTab() === 'Reports') {
      this.jobService.getReports().subscribe(r => { this.reports.set(r); this.loading.set(false); });
    } else if (this.activeTab() === 'Dsa') {
      this.pro.signalements(this.dsaFiltre() || undefined).subscribe({
        next: (s) => { this.dsa.set(s); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else if (this.activeTab() === 'Retours') {
      this.pro.retoursCourriel().subscribe({
        next: (r) => { this.retours.set(r); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    } else {
      this.admin.getModerationQueue(this.activeTab()).subscribe(o => {
        this.offers.set(o);
        this.loading.set(false);
      });
    }
  }

  switchTab(tab: string) { this.activeTab.set(tab); this.load(); }

  // ══════════════════════════════════════
  //  Signalements DSA
  // ══════════════════════════════════════

  filtrerDsa(statut: string) { this.dsaFiltre.set(statut); this.load(); }

  ouvrirDossier(s: SignalementAdmin) {
    if (this.dsaOuvert() === s.id) { this.dsaOuvert.set(null); return; }
    this.dsaOuvert.set(s.id);
    // Reprend la décision déjà rendue si le dossier est rouvert : la
    // corriger vaut mieux que la réécrire de mémoire.
    this.dsaDecision = {
      statut: s.statut === 'NonFonde' ? 'NonFonde' : 'Fonde',
      decision: s.decision ?? '',
      mesurePrise: s.mesurePrise ?? 'Aucune',
    };
  }

  /**
   * Le texte exige une motivation, pas un verdict. Vingt caractères est
   * le minimum que le serveur accepte ; on le dit ici plutôt que de
   * laisser partir une requête qui sera refusée.
   */
  get decisionValide(): boolean {
    return this.dsaDecision.decision.trim().length >= 20;
  }

  deciderDsa(s: SignalementAdmin) {
    if (!this.decisionValide) return;

    this.pro.deciderSignalement(s.id, { ...this.dsaDecision }).subscribe({
      next: () => {
        this.toastr.success(
          s.emailDeclarant
            ? 'Décision enregistrée et transmise au déclarant.'
            : 'Décision enregistrée. Le déclarant n’a pas laissé d’adresse : il la lira par sa référence.',
        );
        this.dsaOuvert.set(null);
        this.load();
      },
      error: (e) => this.toastr.error(e?.error?.message ?? "La décision n'a pas été enregistrée."),
    });
  }

  /**
   * Rouvre une adresse bloquée.
   *
   * La liste montrait le problème sans offrir le remède : une adresse
   * bloquée sur un faux signal — panne passagère remontée en rejet dur —
   * était coupée de tout, y compris de la réinitialisation de mot de
   * passe, qui est justement ce qu'on utilise quand on n'arrive plus à
   * entrer. Le compte était perdu pour son titulaire.
   */
  async debloquer(r: RetourCourriel) {
    const ok = await confirmer({
      titre: `Rouvrir ${r.email} ?`,
      texte:
        "Les envois vers cette adresse reprendront au prochain message. Si le blocage venait d'un rejet dur légitime — boîte inexistante — le retour d'expédition la bloquera de nouveau, et notre réputation d'expéditeur en pâtira.",
      confirmer: 'Rouvrir',
    });
    if (!ok) return;

    this.pro.debloquerAdresse(r.id).subscribe({
      next: (rep) => { this.toastr.success(rep.message); this.load(); },
      error: (e) => this.toastr.error(e?.error?.message ?? "Le déblocage n'a pas abouti."),
    });
  }

  libelleStatutDsa(statut: string): string {
    return {
      Recu: 'Reçu',
      EnCours: 'En cours',
      Fonde: 'Fondé',
      NonFonde: 'Non retenu',
    }[statut] ?? statut;
  }

  /**
   * Depuis combien de jours le dossier attend.
   *
   * Le règlement ne fixe pas de délai chiffré : il demande un traitement
   * « en temps opportun ». Afficher l'attente est le seul moyen que
   * personne ne découvre un dossier de trois semaines.
   */
  attenteEnJours(s: SignalementAdmin): number {
    return Math.floor((Date.now() - new Date(s.creeLe).getTime()) / 86_400_000);
  }

  // ── Signalements ──
  resolveReport(id: number, status: string) {
    this.jobService.updateReport(id, status).subscribe(() => {
      this.toastr.success(status === 'Reviewed' ? 'Signalement traité' : 'Signalement rejeté');
      this.load();
    });
  }
  reportStatusLabel(status: string): string {
    return { Pending: 'En attente', Reviewed: 'Traité', Dismissed: 'Rejeté' }[status] || status;
  }

  // ── Modération des avis entreprise ──
  moderateReview(id: number, status: string) {
    this.reviewSvc.setReviewStatus(id, status).subscribe(() => {
      this.toastr.success(status === 'Approved' ? 'Avis approuvé' : 'Avis masqué');
      this.load();
    });
  }
  reviewStars(n: number): number[] { return Array.from({ length: n }, (_, i) => i); }

  /* ═══ Second avis sur une offre douteuse ═══
     Les règles de `QualiteCatalogue` reconnaissent des motifs : demande
     d'argent, coordonnées bancaires, messagerie privée. Elles ne savent
     pas lire une annonce dont chaque phrase est anodine et dont
     l'ensemble ne tient pas debout.

     À la demande, une offre à la fois, quand le modérateur ouvre la
     fiche. Pas au chargement de la file : elle peut compter cent entrées,
     et cent appels par ouverture d'écran videraient le quota du jour
     avant midi.

     L'avis n'écrit rien et ne décide rien. Approuver et rejeter restent
     des gestes humains. */
  avis = signal<Map<number, { risque: number | null; avis: string | null; disponible: boolean }>>(new Map());
  avisEnCours = signal<number | null>(null);

  avisDe(id: number) { return this.avis().get(id) ?? null; }

  demanderAvis(id: number) {
    if (this.avisEnCours() !== null || this.avis().has(id)) return;
    this.avisEnCours.set(id);

    this.admin.avisModeration(id).subscribe({
      next: (a) => {
        this.avis.update((m) => new Map(m).set(id, a));
        this.avisEnCours.set(null);
      },
      // Modèle non configuré, quota atteint, API tombée : l'écran se
      // passe de lui et le dit, plutôt que de laisser un bouton tourner.
      error: () => {
        this.avis.update((m) => new Map(m).set(id, { risque: null, avis: null, disponible: false }));
        this.avisEnCours.set(null);
      },
    });
  }

  approve(id: number) {
    this.admin.approveOffer(id).subscribe(() => {
      this.toastr.success('Offre approuvée');
      this.load();
    });
  }

  startReject(id: number) { this.rejectingId.set(id); this.rejectNote = ''; }
  cancelReject() { this.rejectingId.set(null); }

  confirmReject(id: number) {
    this.admin.rejectOffer(id, this.rejectNote).subscribe(() => {
      this.toastr.success('Offre rejetée');
      this.rejectingId.set(null);
      this.load();
    });
  }

  moderationLabel(status: string): string {
    return { Pending: 'En attente', Approved: 'Approuvee', Rejected: 'Rejetee' }[status] || status;
  }

  toggleFeature(id: number) {
    this.admin.toggleFeature(id).subscribe((res) => {
      this.toastr.success(res.isFeatured ? 'Mise en avant' : 'Retiree de la une');
      this.load();
    });
  }
}
