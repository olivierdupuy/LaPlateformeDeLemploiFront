import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {
  PlateformeProService,
  MotifSignalement,
  SuiviSignalement,
} from '../../services/plateforme-pro.service';
import { SeoService } from '../../services/seo.service';
import { Explication } from '../explication/explication';

/**
 * Signaler un contenu illicite.
 *
 * Les mentions légales renvoyaient vers une adresse de courriel. Le
 * règlement européen sur les services numériques demande autre chose :
 * un mécanisme électronique facile d'accès, un accusé de réception, une
 * décision motivée et l'indication des voies de recours. Une boîte aux
 * lettres n'en fournit aucun, et rien ne prouvait qu'un signalement
 * avait été reçu.
 *
 * Ouvert sans compte — c'est la condition pour que le mécanisme compte.
 * En échange, le déclarant repart avec une référence, qui lui permet de
 * suivre le dossier sans s'identifier.
 */
@Component({
  selector: 'app-dsa-report',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, Explication],
  templateUrl: './dsa-report.html',
  styleUrl: './dsa-report.scss',
})
export class DsaReport implements OnInit {
  private service = inject(PlateformeProService);
  private route = inject(ActivatedRoute);
  private seo = inject(SeoService);

  readonly motifs = signal<MotifSignalement[]>([]);
  readonly envoi = signal(false);
  readonly reference = signal<string | null>(null);
  readonly confirmation = signal<string | null>(null);
  readonly erreur = signal<string | null>(null);

  /** Suivi d'un dossier existant, par référence. */
  readonly referenceCherchee = signal('');
  readonly suivi = signal<SuiviSignalement | null>(null);
  readonly erreurSuivi = signal<string | null>(null);

  readonly formulaire = {
    typeContenu: 'offre',
    contenuId: '',
    url: '',
    motif: '',
    explication: '',
    emailDeclarant: '',
    declareBonneFoi: false,
    // Le champ-piège et la mesure du temps de saisie : le filtre
    // anti-robot du serveur les attend sur tout formulaire public.
    siteWeb: '',
    msSaisie: 0,
  };

  private ouvertA = 0;

  readonly typesContenu = [
    { cle: 'offre', libelle: "Une offre d'emploi" },
    { cle: 'avis', libelle: "Un avis sur une entreprise" },
    { cle: 'message', libelle: 'Un message reçu' },
    { cle: 'profil', libelle: 'Un profil ou une page entreprise' },
    { cle: 'autre', libelle: 'Autre chose' },
  ];

  ngOnInit(): void {
    this.seo.set({
      title: 'Signaler un contenu illicite',
      description:
        "Signalez un contenu illicite au titre du règlement européen sur les services numériques. Accusé de réception, décision motivée et voies de recours.",
      canonicalPath: '/signalement',
    });

    this.ouvertA = Date.now();
    this.service.motifsSignalement().subscribe({
      next: (m) => this.motifs.set(m),
      error: () => this.motifs.set([]),
    });

    // Un lien « Signaler » depuis une fiche offre pré-remplit ce qu'il
    // sait : sans cela, la personne recopie une adresse à la main et se
    // trompe une fois sur deux.
    const p = this.route.snapshot.queryParamMap;
    if (p.get('type')) this.formulaire.typeContenu = p.get('type')!;
    if (p.get('id')) this.formulaire.contenuId = p.get('id')!;
    this.formulaire.url = p.get('url') ?? location.origin + (p.get('chemin') ?? '');
  }

  get valide(): boolean {
    return (
      !!this.formulaire.motif &&
      this.formulaire.explication.trim().length >= 30 &&
      this.formulaire.declareBonneFoi
    );
  }

  envoyer(): void {
    if (!this.valide || this.envoi()) return;

    this.envoi.set(true);
    this.erreur.set(null);
    this.formulaire.msSaisie = Date.now() - this.ouvertA;

    this.service.signaler({ ...this.formulaire }).subscribe({
      next: (r) => {
        this.reference.set(r.reference);
        this.confirmation.set(r.message);
        this.envoi.set(false);
      },
      error: (e) => {
        this.erreur.set(e?.error?.message ?? "Le signalement n'a pas pu être enregistré.");
        this.envoi.set(false);
      },
    });
  }

  chercher(): void {
    const ref = this.referenceCherchee().trim().toUpperCase();
    if (!ref) return;

    this.erreurSuivi.set(null);
    this.service.suivreSignalement(ref).subscribe({
      next: (s) => this.suivi.set(s),
      error: (e) => {
        this.suivi.set(null);
        this.erreurSuivi.set(e?.error?.message ?? 'Aucun dossier ne porte cette référence.');
      },
    });
  }

  libelleStatut(statut: string): string {
    return (
      {
        Recu: 'Reçu, en attente d’examen',
        EnCours: 'En cours d’examen',
        Fonde: 'Signalement fondé',
        NonFonde: 'Signalement non retenu',
      }[statut] ?? statut
    );
  }
}
