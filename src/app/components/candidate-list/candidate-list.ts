import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RecruiterFeaturesService } from '../../services/recruiter-features.service';
import { JobOfferService } from '../../services/job-offer';
import { ToastrService } from 'ngx-toastr';
import { companyColor } from '../../utils/job.utils';
import { ConsoleShell } from '../console-shell/console-shell';

@Component({
  selector: 'app-candidate-list',
  imports: [RouterLink, FormsModule, ConsoleShell],
  templateUrl: './candidate-list.html',
  styleUrl: './candidate-list.scss',
})
export class CandidateList implements OnInit {
  private recruiterService = inject(RecruiterFeaturesService);
  private jobService = inject(JobOfferService);
  private toastr = inject(ToastrService);
  private route = inject(ActivatedRoute);

  candidates = signal<any[]>([]);
  loading = signal(true);
  companyColor = companyColor;

  // Filters
  search = '';
  skills = '';
  city = '';
  minExperience: number | undefined;
  maxExperience: number | undefined;
  education = '';
  sort = '';

  /* ── Inviter à postuler ──
     Le vivier permettait de trouver quelqu'un et de le regarder. Pour lui
     parler, il fallait passer par la messagerie, hors de toute offre : le
     candidat recevait « votre profil m'intéresse » sans savoir pour quel
     poste. */
  mesOffres = signal<{ id: number; title: string }[]>([]);
  invitationOuverte = signal<string | null>(null);
  offreChoisie = 0;
  motInvitation = '';
  invitesDejaEnvoyees = signal<Set<string>>(new Set());

  ouvrirInvitation(id: string, e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.offreChoisie = this.mesOffres()[0]?.id ?? 0;
    this.motInvitation = '';
    this.invitationOuverte.update((v) => (v === id ? null : id));
  }

  envoyerInvitation(candidatId: string) {
    if (!this.offreChoisie) return;
    this.recruiterService.inviter(this.offreChoisie, candidatId, this.motInvitation || undefined).subscribe({
      next: () => {
        this.invitesDejaEnvoyees.update((s) => new Set(s).add(candidatId));
        this.invitationOuverte.set(null);
        this.toastr.success('Invitation envoyée');
      },
      error: (e) => this.toastr.error(e?.error?.message ?? "L'invitation n'a pas pu être envoyée"),
    });
  }
  /** Ne montrer que les candidats qui se sont declares disponibles. */
  disponible = false;
  showFilters = false;

  /**
   * Les criteres se lisent dans l'adresse.
   *
   * Sans cela, une competence cliquee sur une fiche candidat ne pouvait
   * pas ouvrir le vivier filtre dessus, et une recherche du vivier
   * n'etait ni partageable ni retrouvable par le retour arriere.
   */
  ngOnInit() {
    // Les offres en ligne de l'équipe : on n'invite que sur une annonce
    // que le candidat pourra effectivement ouvrir.
    this.jobService.getMyOffers('team').subscribe({
      next: (o) =>
        this.mesOffres.set(
          o.filter((x) => x.isActive && !x.isDraft && x.moderationStatus === 'Approved')
           .map((x) => ({ id: x.id, title: x.title })),
        ),
      error: () => {},
    });

    const p = this.route.snapshot.queryParamMap;
    this.search = p.get('q') ?? '';
    this.skills = p.get('skills') ?? '';
    this.city = p.get('city') ?? '';
    this.education = p.get('education') ?? '';
    this.sort = p.get('sort') ?? '';
    this.disponible = p.get('disponible') === 'true';
    const min = p.get('minExperience');
    const max = p.get('maxExperience');
    if (min) this.minExperience = +min;
    if (max) this.maxExperience = +max;
    // Un critere venu de l'adresse doit se voir : le repli s'ouvre s'il
    // porte autre chose qu'une simple recherche plein texte.
    if (this.skills || this.city || this.education || min || max) this.showFilters = true;

    this.loadCandidates();
  }

  loadCandidates() {
    this.loading.set(true);
    this.recruiterService.searchCandidates({
      search: this.search || undefined,
      skills: this.skills || undefined,
      city: this.city || undefined,
      minExperience: this.minExperience,
      maxExperience: this.maxExperience,
      education: this.education || undefined,
      sort: this.sort || undefined,
      disponible: this.disponible ? 'true' : undefined,
    }).subscribe({
      next: (data) => { this.candidates.set(data); this.loading.set(false); },
      error: () => { this.loading.set(false); },
    });
  }

  clearFilters() {
    this.search = ''; this.skills = ''; this.city = '';
    this.minExperience = undefined; this.maxExperience = undefined;
    this.education = ''; this.sort = ''; this.disponible = false;
    this.loadCandidates();
  }

  getInitials(c: any): string {
    return (c.firstName?.charAt(0) || '') + (c.lastName?.charAt(0) || '');
  }

  /**
   * Rappel des criteres actifs.
   *
   * Les filtres vivent dans un repli : une fois referme, rien ne disait
   * plus qu'une recherche etait restreinte. On croyait le vivier vide
   * alors qu'on l'avait borne a « Lyon, 5 ans minimum » trois minutes
   * plus tot.
   */
  get activeCriteria(): { key: string; label: string; value: string }[] {
    const out: { key: string; label: string; value: string }[] = [];
    if (this.search) out.push({ key: 'search', label: 'Recherche', value: this.search });
    if (this.skills) out.push({ key: 'skills', label: 'Compétences', value: this.skills });
    if (this.city) out.push({ key: 'city', label: 'Ville', value: this.city });
    if (this.education) out.push({ key: 'education', label: 'Formation', value: this.education });
    if (this.minExperience != null) out.push({ key: 'minExperience', label: 'Exp. min', value: `${this.minExperience} an(s)` });
    if (this.maxExperience != null) out.push({ key: 'maxExperience', label: 'Exp. max', value: `${this.maxExperience} an(s)` });
    return out;
  }

  removeCriterion(key: string) {
    switch (key) {
      case 'search': this.search = ''; break;
      case 'skills': this.skills = ''; break;
      case 'city': this.city = ''; break;
      case 'education': this.education = ''; break;
      case 'minExperience': this.minExperience = undefined; break;
      case 'maxExperience': this.maxExperience = undefined; break;
    }
    this.loadCandidates();
  }
}
