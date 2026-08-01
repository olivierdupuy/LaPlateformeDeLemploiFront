import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DecimalPipe } from '@angular/common';
import { ApplicationService } from '../../services/application';
import { AuthService } from '../../services/auth.service';
import { ConsoleShell } from '../console-shell/console-shell';

/** Une chose a traiter, posee en haut du tableau de bord. */
interface Todo {
  key: string;
  icon: string;
  text: string;
  sub: string;
  cta: string;
  link: string;
  tone: 'due' | 'info';
}

@Component({
  selector: 'app-dashboard-recruiter',
  imports: [RouterLink, DecimalPipe, ConsoleShell],
  templateUrl: './dashboard-recruiter.html',
  styleUrl: './dashboard-recruiter.scss',
})
export class DashboardRecruiter implements OnInit {
  private appService = inject(ApplicationService);
  auth = inject(AuthService);

  data = signal<any>(null);
  loading = signal(true);

  ngOnInit() {
    this.appService.getRecruiterStats().subscribe({
      next: (d) => { this.data.set(d); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  /**
   * Ce qui attend une decision.
   *
   * Le panneau existait, mais relegue dans une colonne de droite de trois
   * cent cinquante pixels, sous deux graphiques qui occupaient tout
   * l'ecran. C'est pourtant la seule chose qu'un recruteur vient faire ici :
   * savoir qui attend une reponse. Il passe devant.
   */
  todos = computed<Todo[]>(() => {
    const d = this.data();
    if (!d) return [];
    const out: Todo[] = [];

    if (d.enAttente > 0) {
      out.push({
        key: 'pending', icon: 'bi-hourglass-split', tone: 'due',
        text: `${d.enAttente} candidature${d.enAttente > 1 ? 's' : ''} en attente`,
        sub: "Personne ne les a encore examinées",
        cta: 'Les examiner', link: '/recruteur/candidatures',
      });
    }

    if (d.messagesNonLus > 0) {
      out.push({
        key: 'msg', icon: 'bi-chat-dots', tone: 'due',
        text: `${d.messagesNonLus} message${d.messagesNonLus > 1 ? 's' : ''} non lu${d.messagesNonLus > 1 ? 's' : ''}`,
        sub: 'Un candidat attend votre réponse',
        cta: 'Ouvrir la messagerie', link: '/messagerie',
      });
    }

    if (d.entretiensPlanifies > 0) {
      out.push({
        key: 'itw', icon: 'bi-calendar-event', tone: 'info',
        text: `${d.entretiensPlanifies} entretien${d.entretiensPlanifies > 1 ? 's' : ''} planifié${d.entretiensPlanifies > 1 ? 's' : ''}`,
        sub: 'Vérifiez vos prochaines dates',
        cta: 'Voir le calendrier', link: '/entretiens',
      });
    }

    if (d.offresExpirees > 0) {
      out.push({
        key: 'expired', icon: 'bi-clock-history', tone: 'info',
        text: `${d.offresExpirees} offre${d.offresExpirees > 1 ? 's' : ''} expirée${d.offresExpirees > 1 ? 's' : ''}`,
        sub: 'Une offre hors ligne ne reçoit plus rien — renouvelez-la',
        cta: 'Voir mes offres', link: '/recruteur/offres',
      });
    }

    if (d.offresActives === 0) {
      out.push({
        key: 'none', icon: 'bi-plus-circle', tone: 'due',
        text: 'Aucune offre en ligne',
        sub: "Publiez-en une pour recevoir des candidatures",
        cta: 'Publier une offre', link: '/recruteur/offres/nouvelle',
      });
    }

    // Une offre en ligne qui n'a rien recu : ni un manque a traiter, ni
    // une bonne nouvelle — une piste a verifier.
    const muettes = this.offerRows().filter((o) => o.value === 0).length;
    if (muettes > 0 && d.offresActives > 0) {
      out.push({
        key: 'silent', icon: 'bi-megaphone', tone: 'info',
        text: `${muettes} offre${muettes > 1 ? 's' : ''} sans aucune candidature`,
        sub: 'Intitulé, salaire, lieu : ce sont les trois premiers filtres des candidats',
        cta: 'Les revoir', link: '/recruteur/offres',
      });
    }

    return out;
  });

  /**
   * Le parcours d'une candidature vu du recruteur.
   *
   * Remplace l'anneau des statuts, qui peignait quatre etats en vert,
   * orange, rouge et bleu clair — des couleurs ecrites en dur, hors de
   * toute palette du produit — et qui, pour deux candidatures, dessinait
   * un camembert a deux parts.
   */
  funnel = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = d.totalCandidatures || 0;
    const steps = [
      { key: 'in', label: 'Reçues', value: total, icon: 'bi-inbox' },
      { key: 'seen', label: 'Examinées', value: (d.examinees || 0) + (d.acceptees || 0) + (d.refusees || 0), icon: 'bi-eye' },
      { key: 'itw', label: 'Entretiens', value: d.entretiensPlanifies || 0, icon: 'bi-calendar-event' },
      { key: 'ok', label: 'Acceptées', value: d.acceptees || 0, icon: 'bi-check-circle' },
    ];
    return steps.map((s) => ({ ...s, pct: total ? Math.round((s.value / total) * 100) : 0 }));
  });

  /**
   * Les offres classees par nombre de candidatures.
   *
   * Un graphique a barres horizontales dessinait la meme chose — sauf
   * qu'une offre sans candidature n'y avait pas de barre : elle
   * disparaissait purement et simplement, alors que c'est justement celle
   * dont le recruteur doit s'occuper. Une liste montre le zero, et chaque
   * ligne mene aux candidatures de l'offre.
   */
  offerRows = computed(() => {
    const rows = (this.data()?.candidaturesParOffre ?? []) as { label: string; value: number }[];
    const max = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r) => ({ ...r, pct: Math.round((r.value / max) * 100) }));
  });

  /** Part des candidatures sur lesquelles une decision a ete prise. */
  traitees = computed(() => {
    const d = this.data();
    if (!d?.totalCandidatures) return 0;
    return Math.round(((d.totalCandidatures - d.enAttente) / d.totalCandidatures) * 100);
  });
}
