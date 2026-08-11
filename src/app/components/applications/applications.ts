import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { InterviewService } from '../../services/interview.service';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';
import { Application } from '../../models/job-offer.model';
import { companyColor } from '../../utils/job.utils';
import { FichiersService } from '../../utils/fichiers';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { ConsoleShell } from '../console-shell/console-shell';
import { Explication } from '../explication/explication';
import { ETATS_CANDIDATURE, ORDRE_CANDIDATURE, pastilleStatut, libelleStatut, iconeStatut } from '../../utils/statut-candidature';
import { reponsesDe, vocabulairePreselection, Reponse } from '../../utils/preselection';

@Component({
  selector: 'app-applications',
  imports: [RouterLink, DatePipe, FormsModule, ConsoleShell, Explication],
  templateUrl: './applications.html',
  styleUrl: './applications.scss',
})
export class Applications implements OnInit {
  private appService = inject(ApplicationService);
  private interviewService = inject(InterviewService);
  private recruiterService = inject(RecruiterFeaturesService);
  private toastr = inject(ToastrService);
  companyColor = companyColor;
  /** Les CV passent par une route authentifiee : plus de lien nu. */
  fichiers = inject(FichiersService);

  applications = signal<Application[]>([]);
  loading = signal(true);
  editingNotesId = signal<number | null>(null);
  schedulingId = signal<number | null>(null);
  notesText = '';
  filterStatus = '';
  viewMode = signal<'list' | 'kanban'>('list');
  selectedIds = signal<Set<number>>(new Set());

  interviewForm = { proposedAt: '', location: '', notes: '', duration: 60, type: 'Visio', interviewerName: '' };

  /* ═══ Tri et filtres ═══
     La page ne savait filtrer que par statut. Passe la dizaine de
     candidatures — et surtout des que plusieurs offres sont en ligne —
     un recruteur ne trie pas « toutes les candidatures en attente », il
     trie « les candidatures en attente pour ce poste ». */
  query = signal('');
  offerFilter = signal<number | ''>('');
  sort = signal<'recent' | 'old' | 'name' | 'status' | 'correspondance'>('recent');

  /** Les offres reellement representees dans les candidatures recues. */
  offers = computed(() => {
    const seen = new Map<number, string>();
    for (const a of this.applications()) {
      if (a.jobOfferId && !seen.has(a.jobOfferId)) {
        seen.set(a.jobOfferId, a.jobOffer?.title || `Offre ${a.jobOfferId}`);
      }
    }
    return [...seen].map(([id, title]) => ({ id, title }));
  });

  /* ═══ Correspondance avec le poste ═══
     Un score de correspondance n'a de sens que face à une offre précise :
     comparer un candidat d'une annonce de plombier à un candidat d'une
     annonce de comptable ne veut rien dire. On ne le charge donc que
     lorsque le recruteur a choisi une offre, et le tri « correspondance »
     n'apparaît qu'à ce moment-là.

     Le serveur ne trie ni n'écarte : il rend un score, ses raisons et ses
     réserves pour chaque candidature. Le classement reste un geste du
     recruteur — une liste rangée d'office par un score caché est une
     liste dont les derniers ne sont jamais lus. */
  correspondances = signal<Map<number, { score: number | null; fiabilite: number; estimation: boolean; raisons: string[]; reserves: string[] }>>(new Map());

  correspondance(id: number) {
    return this.correspondances().get(id) ?? null;
  }

  private chargerCorrespondances(offreId: number | '') {
    if (offreId === '') {
      this.correspondances.set(new Map());
      if (this.sort() === 'correspondance') this.sort.set('recent');
      return;
    }

    this.appService.getCorrespondances(offreId).subscribe({
      next: (lignes) => this.correspondances.set(
        new Map(lignes.map((l) => [l.candidatureId, l]))),
      // Sans correspondances, la page reste exactement ce qu'elle était.
      error: () => this.correspondances.set(new Map()),
    });
  }

  choisirOffre(valeur: number | '') {
    this.offerFilter.set(valeur);
    this.chargerCorrespondances(valeur);
  }

  /** Ordre des statuts dans le parcours, pour le tri « par avancement ». */
  private readonly ORDRE = ORDRE_CANDIDATURE;

  /** Les six états, pour le sélecteur de chaque ligne et le tableau. */
  readonly etats = ETATS_CANDIDATURE;

  /* ── Filtres de tri du volume ──
     Le filtre par statut et la recherche libre suffisent à dix
     candidatures. À deux cents, ce qu'on cherche est « les Parisiens qui
     ont le permis » — et les réponses de présélection, qu'on demandait
     déjà sans pouvoir s'en servir, étaient le seul endroit où cette
     information existe. */
  filtreVille = signal('');
  /** Seuil de qualification : '' | '100' (toutes) | '50' (la moitié). */
  filtreQualification = signal('');
  filtreQuestion = signal('');
  filtreReponse = signal('');

  /** Les villes déclarées, dédoublonnées sans la casse. */
  villes = computed(() => {
    const par = new Map<string, string>();
    for (const a of this.applications()) {
      const v = (a.city ?? '').trim();
      if (v) par.set(v.toLowerCase(), v);
    }
    return [...par.values()].sort((x, y) => x.localeCompare(y, 'fr'));
  });

  /** Question → réponses effectivement données. */
  preselection = computed(() =>
    vocabulairePreselection(
      this.applications().map((a) => ({
        questions: a.jobOffer?.screeningQuestions,
        reponses: a.screeningAnswers,
      })),
    ),
  );

  questionsPreselection = computed(() => [...this.preselection().keys()]);
  reponsesPossibles = computed(() => this.preselection().get(this.filtreQuestion()) ?? []);

  /** Les réponses d'une candidature, pour les montrer sur sa ligne. */
  reponsesDe = (a: Application): Reponse[] =>
    reponsesDe(a.jobOffer?.screeningQuestions, a.screeningAnswers);

  aUnFiltreFin = computed(
    () => !!(this.filtreVille() || this.filtreQualification() || this.filtreQuestion()),
  );

  viderFiltresFins() {
    this.filtreVille.set('');
    this.filtreQualification.set('');
    this.filtreQuestion.set('');
    this.filtreReponse.set('');
  }

  filtered = computed(() => {
    const f = this.filterStatus;
    const off = this.offerFilter();
    const q = this.query().trim().toLowerCase();
    const s = this.sort();

    const ville = this.filtreVille().toLowerCase();
    const seuil = this.filtreQualification() ? Number(this.filtreQualification()) : null;
    const question = this.filtreQuestion();
    const reponse = this.filtreReponse();

    const out = this.applications().filter((a) => {
      if (f && a.status !== f) return false;
      if (off !== '' && a.jobOfferId !== off) return false;
      if (ville && (a.city ?? '').toLowerCase() !== ville) return false;

      // Une candidature sans score est écartée dès qu'un seuil est posé.
      // Ce n'est pas un mauvais dossier — c'est une offre sans réponse
      // idéale, ou un dépôt d'avant les questions — mais demander « au
      // moins la moitié » et recevoir des dossiers non notés ne répond
      // pas à la question posée.
      if (seuil !== null && (a.qualificationScore ?? -1) < seuil) return false;

      if (question) {
        const trouvee = this.reponsesDe(a).find((r) => r.question === question);
        if (!trouvee) return false;
        if (reponse && trouvee.reponse !== reponse) return false;
      }

      if (!q) return true;
      const hay = `${a.fullName ?? ''} ${a.email ?? ''} ${a.jobOffer?.title ?? ''}`.toLowerCase();
      return hay.includes(q);
    });

    // Copie avant tri : `filter` en rend une neuve, mais mieux vaut que
    // ce soit explicite — trier en place le tableau du signal le
    // muterait sous les autres calculs.
    return [...out].sort((a, b) => {
      switch (s) {
        case 'old': return +new Date(a.appliedAt) - +new Date(b.appliedAt);
        case 'name': return (a.fullName ?? '').localeCompare(b.fullName ?? '', 'fr');
        case 'status': return (this.ORDRE[a.status] ?? 9) - (this.ORDRE[b.status] ?? 9);
        // Une candidature sans score — profil non renseigné, dépôt sans
        // compte — passe en fin de liste plutôt que d'être traitée comme
        // un zéro : c'est une absence d'information, pas un mauvais
        // dossier, et elle reste visible.
        case 'correspondance':
          return (this.correspondance(b.id)?.score ?? -1) - (this.correspondance(a.id)?.score ?? -1);
        default: return +new Date(b.appliedAt) - +new Date(a.appliedAt);
      }
    });
  });

  /** Vrai des qu'un critere restreint la liste — pour proposer de l'effacer. */
  hasFilters = computed(() => !!this.filterStatus || this.offerFilter() !== '' || !!this.query().trim());

  clearFilters() {
    this.filterStatus = '';
    this.choisirOffre('');
    this.query.set('');
  }

  counts = computed(() => {
    const apps = this.applications();
    return {
      total: apps.length,
      pending: apps.filter(a => a.status === 'Pending').length,
      reviewed: apps.filter(a => a.status === 'Reviewed').length,
      accepted: apps.filter(a => a.status === 'Accepted').length,
      rejected: apps.filter(a => a.status === 'Rejected').length,
    };
  });

  /* Les colonnes lisent la liste filtree, pas la liste brute.
     La recherche et le filtre par offre n'avaient aucun effet en vue
     kanban : on cherchait un candidat, la liste se reduisait a une carte,
     et le kanban continuait d'en afficher quarante. Le filtre par statut
     est en revanche ignore ici — c'est le kanban lui-meme qui range par
     statut, l'appliquer deux fois viderait trois colonnes sur quatre. */
  private forBoard = computed(() => {
    const off = this.offerFilter();
    const q = this.query().trim().toLowerCase();
    return this.applications().filter((a) => {
      if (off !== '' && a.jobOfferId !== off) return false;
      if (!q) return true;
      return `${a.fullName ?? ''} ${a.email ?? ''} ${a.jobOffer?.title ?? ''}`.toLowerCase().includes(q);
    });
  });

  /**
   * Une colonne par etat, derivee de la liste partagee.
   *
   * Elles etaient quatre, ecrites en clair dans le gabarit avec leur
   * libelle et leur couleur. Le serveur en accepte six depuis
   * l'elargissement du parcours : les deux nouvelles n'auraient eu
   * aucune colonne, et les candidatures qui s'y trouvent auraient
   * simplement disparu du tableau — sans erreur, sans compteur qui
   * bouge, sans rien pour le signaler.
   */
  colonnes = computed(() =>
    ETATS_CANDIDATURE.map((e) => ({
      status: e.cle as string,
      label: e.libelle,
      cls: e.pastille,
      items: this.forBoard().filter((a) => a.status === e.cle),
    })),
  );

  /** Nombre de candidatures visibles sur le tableau, filtres compris. */
  boardCount = computed(() => this.forBoard().length);

  /** Depuis combien de temps la candidature attend. */
  daysSince(date: string): number {
    return Math.floor((Date.now() - new Date(date).getTime()) / 86_400_000);
  }

  sinceLabel(date: string): string {
    const d = this.daysSince(date);
    if (d <= 0) return "aujourd'hui";
    if (d === 1) return 'hier';
    if (d < 7) return `il y a ${d} j`;
    if (d < 31) return `il y a ${Math.floor(d / 7)} sem.`;
    return `il y a ${Math.floor(d / 30)} mois`;
  }

  /** Une candidature en attente depuis plus d'une semaine se signale. */
  isStale(app: Application): boolean {
    return app.status === 'Pending' && this.daysSince(app.appliedAt) >= 7;
  }

  ngOnInit() { this.load(); }

  load() {
    this.loading.set(true);
    this.appService.getAll().subscribe((apps) => { this.applications.set(apps); this.loading.set(false); });
  }

  getStatusBadgeClass(s: string): string { return pastilleStatut(s); }
  getStatusLabel(s: string): string { return libelleStatut(s); }
  getStatusIcon(s: string): string { return iconeStatut(s); }

  updateStatus(app: Application, status: string) {
    this.appService.updateStatus(app.id, status).subscribe({
      next: () => { app.status = status; this.applications.update(a => [...a]); this.toastr.success(`Statut : ${this.getStatusLabel(status)}`); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  getScreeningAnswers(app: Application): { question: string; answer: string }[] {
    if (!app.screeningAnswers) return [];
    try { return JSON.parse(app.screeningAnswers) || []; } catch { return []; }
  }

  /* ── Notes d'équipe ──
     « recruiterNotes » reste le brouillon personnel attaché au dossier.
     Ce fil-ci est la conversation d'équipe qui manquait : elle s'empile,
     porte ses auteurs, et personne n'y efface le mot d'un autre. */
  notesEquipe = signal<{ id: number; auteurNom: string; contenu: string; creeLe: string; aMoi: boolean }[]>([]);
  nouvelleNote = '';

  openNotes(app: Application) {
    this.editingNotesId.set(app.id);
    this.notesText = app.recruiterNotes || '';
    this.nouvelleNote = '';
    this.notesEquipe.set([]);
    this.recruiterService.notesEquipe(app.id).subscribe({
      next: (l) => this.notesEquipe.set(l),
      error: () => {},
    });
  }

  ajouterNote(app: Application) {
    const mot = this.nouvelleNote.trim();
    if (!mot) return;
    this.recruiterService.ajouterNoteEquipe(app.id, mot).subscribe({
      next: (n) => { this.notesEquipe.update((l) => [...l, n]); this.nouvelleNote = ''; },
      error: (e) => this.toastr.error(e?.error?.message ?? "La note n'a pas pu être ajoutée"),
    });
  }

  retirerNote(app: Application, id: number) {
    this.recruiterService.retirerNoteEquipe(app.id, id).subscribe({
      next: () => this.notesEquipe.update((l) => l.filter((n) => n.id !== id)),
      error: () => this.toastr.error("La note n'a pas pu être retirée"),
    });
  }
  saveNotes(app: Application) {
    this.appService.updateNotes(app.id, this.notesText).subscribe({
      next: () => { app.recruiterNotes = this.notesText; this.editingNotesId.set(null); this.toastr.success('Notes enregistrées'); },
      error: () => this.toastr.error('Erreur'),
    });
  }
  cancelNotes() { this.editingNotesId.set(null); }

  async deleteApplication(app: Application) {
    const res = await Swal.fire({ title: 'Supprimer cette candidature ?', text: `Candidature de ${app.fullName}`, icon: 'warning', showCancelButton: true, confirmButtonColor: '#c6364b', confirmButtonText: 'Supprimer', cancelButtonText: 'Annuler' });
    if (res.isConfirmed) {
      this.appService.delete(app.id).subscribe({
        next: () => { this.applications.update((a) => a.filter((x) => x.id !== app.id)); this.toastr.success('Supprimee'); },
        error: () => this.toastr.error('Erreur'),
      });
    }
  }

  // ── Interview scheduling ──
  openSchedule(appId: number) {
    this.schedulingId.set(appId);
    this.interviewForm = { proposedAt: '', location: '', notes: '', duration: 60, type: 'Visio', interviewerName: '' };
  }
  cancelSchedule() { this.schedulingId.set(null); }
  submitInterview(appId: number) {
    if (!this.interviewForm.proposedAt) { this.toastr.warning('Sélectionnez une date'); return; }
    this.interviewService.create({
      applicationId: appId, proposedAt: this.interviewForm.proposedAt,
      location: this.interviewForm.location || undefined, notes: this.interviewForm.notes || undefined,
      duration: this.interviewForm.duration || undefined, type: this.interviewForm.type || undefined,
      interviewerName: this.interviewForm.interviewerName || undefined,
    }).subscribe({
      next: () => { this.schedulingId.set(null); this.toastr.success('Entretien planifié — candidat notifié'); },
      error: () => this.toastr.error('Erreur'),
    });
  }

  // ── Kanban ──
  draggedApp: Application | null = null;
  onDragStart(app: Application) { this.draggedApp = app; }
  onDragOver(event: DragEvent) { event.preventDefault(); }
  onDrop(event: DragEvent, status: string) {
    event.preventDefault();
    if (this.draggedApp && this.draggedApp.status !== status) this.updateStatus(this.draggedApp, status);
    this.draggedApp = null;
  }

  // ── Bulk ──
  toggleSelect(id: number) { this.selectedIds.update(s => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; }); }
  isSelected(id: number): boolean { return this.selectedIds().has(id); }
  selectAll() { this.selectedIds.set(new Set(this.filtered().map(a => a.id))); }
  deselectAll() { this.selectedIds.set(new Set()); }
  bulkAction(status: string) {
    const ids = Array.from(this.selectedIds());
    if (!ids.length) return;
    this.recruiterService.bulkUpdateStatus(ids, status).subscribe({
      next: (res) => { this.toastr.success(`${res.updated} candidature(s) mises a jour`); this.selectedIds.set(new Set()); this.load(); },
      error: () => this.toastr.error('Erreur'),
    });
  }
}
