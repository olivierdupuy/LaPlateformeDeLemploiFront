import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { RouterLink } from '@angular/router';
import {
  PlateformeProService,
  ErreurNavigateur,
  FraicheurCatalogue,
  Recettes,
  BilanAssistance,
  RapportRequetesLentes,
} from '../../services/plateforme-pro.service';
import { EtatDuService, TacheSante } from '../../services/admin.service';

/**
 * Exploitation : ce qui casse, ce qui tourne, ce qui a vieilli.
 *
 * `/api/sante` existait déjà et savait dire « sain / dégradé / en
 * panne ». Personne ne l'interrogeait. Quant aux exceptions JavaScript
 * chez les visiteurs, elles n'allaient nulle part : une console que
 * personne n'ouvre, sur un appareil qu'on ne possède pas. Un écran
 * blanc pour tous les utilisateurs de Safari pouvait tenir des semaines
 * — le serveur, lui, répondait 200 à tout.
 *
 * Cette page réunit les deux : l'état des services, et la liste des
 * fautes remontées par les navigateurs, regroupées par empreinte avec
 * leur nombre d'occurrences. Classer une erreur la sort de la liste
 * sans l'effacer ; si elle se reproduit, elle y revient.
 */
@Component({
  selector: 'app-admin-operations',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-operations.html',
  styleUrl: './admin-operations.scss',
})
export class AdminOperations implements OnInit {
  private service = inject(PlateformeProService);
  private toast = inject(ToastrService);

  readonly sante = signal<EtatDuService | null>(null);
  readonly catalogue = signal<FraicheurCatalogue | null>(null);

  /**
   * Ce que le service rapporte.
   *
   * Placé ici et non dans les statistiques : celles-ci répondent à
   * « qu'est-ce qui marche », l'exploitation à « est-ce que ça tourne ».
   * Un service commercial dont on ne sait pas s'il encaisse ne tourne
   * qu'à moitié. Le panneau reste discret tant qu'aucune facture n'a
   * été émise — il n'y a alors rien à montrer.
   */
  readonly recettes = signal<Recettes | null>(null);

  /**
   * Le quota d'assistance du jour.
   *
   * Il vivait en mémoire et personne ne le voyait : la dépense restait
   * invisible jusqu'à la facture. Pire, un plafond atteint ressemblait
   * trait pour trait à un modèle non configuré — le site se tait dans les
   * deux cas, et c'est le comportement voulu.
   */
  readonly assistance = signal<BilanAssistance | null>(null);

  /**
   * Ce qui traîne dans la base.
   *
   * L'intercepteur journalise depuis le début, mais dans Serilog : il
   * fallait un accès au serveur pour savoir pourquoi une page est lente.
   */
  readonly lentes = signal<RapportRequetesLentes | null>(null);
  readonly erreurs = signal<ErreurNavigateur[]>([]);
  readonly classees = signal(false);
  readonly chargement = signal(true);
  readonly detail = signal<number | null>(null);

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.chargement.set(true);
    this.releve.set(new Date());

    this.service.sante().subscribe({
      next: (s) => this.sante.set(s),
      error: () => this.sante.set(null),
    });

    this.service.catalogue().subscribe({
      next: (c) => this.catalogue.set(c),
      error: () => this.catalogue.set(null),
    });

    this.service.recettes().subscribe({
      next: (r) => this.recettes.set(r),
      error: () => this.recettes.set(null),
    });

    this.service.assistance().subscribe({
      next: (a) => this.assistance.set(a),
      error: () => this.assistance.set(null),
    });

    this.service.requetesLentes().subscribe({
      next: (l) => this.lentes.set(l),
      error: () => this.lentes.set(null),
    });

    this.service.erreursNavigateur(this.classees()).subscribe({
      next: (e) => {
        this.erreurs.set(e);
        this.chargement.set(false);
      },
      error: () => this.chargement.set(false),
    });
  }

  basculerVue(): void {
    this.classees.set(!this.classees());
    this.charger();
  }

  classer(e: ErreurNavigateur): void {
    this.service.classerErreur(e.id, !this.classees()).subscribe({
      next: () => {
        this.toast.success(this.classees() ? 'Erreur réouverte.' : 'Erreur classée.');
        this.erreurs.set(this.erreurs().filter((x) => x.id !== e.id));
      },
    });
  }

  // ══════════════════════════════════════
  //  État des services
  // ══════════════════════════════════════
  //
  // La section parcourait la réponse par « Object.entries » et
  // sérialisait en JSON tout ce qui n'était pas scalaire. « controles »
  // et « taches » étant des tableaux d'objets, la page affichait deux
  // dumps JSON de plusieurs centaines de caractères, sur une ligne, en
  // rouge : ils débordaient hors du cadre et poussaient l'étiquette à
  // une colonne d'un caractère de large, qui se lisait verticalement,
  // une lettre par ligne.
  //
  // Le commentaire disait « l'état est un objet libre côté serveur ».
  // Il ne l'est pas : « EtatDuService » le décrit champ par champ
  // depuis le début, et les types étaient là, inutilisés.


  /** Combien de tâches demandent de l'attention. */
  tachesEnPeine(): number {
    return this.sante()?.taches.filter((t) => t.inquiete).length ?? 0;
  }

  /** Combien de contrôles ne répondent pas normalement. */
  controlesEnPeine(): number {
    return this.sante()?.controles.filter((c) => c.etat !== 'sain').length ?? 0;
  }

  /**
   * La pastille du kit prend une couleur en ligne, pas une classe.
   *
   * Trois teintes seulement, et elles se lisent au remplissage : le
   * pétrole pour ce qui va, l'encre pour ce qui traîne, le crimson pour
   * ce qui est tombé. Le libellé à côté nomme l'état — la couleur seule
   * ne dit jamais rien.
   */
  couleurEtat(etat: string): string {
    switch (etat) {
      case 'en panne': return 'var(--danger)';
      case 'dégradé': return 'var(--ink-soft)';
      default: return 'var(--bleu-500)';
    }
  }

  /**
   * Le verdict, en une phrase qui nomme le coupable.
   *
   * « Dégradé » sans dire quoi n'apprend rien — c'est le nom du service
   * en peine qu'on vient chercher, et c'est la seule phrase que
   * beaucoup de visites liront.
   */
  resumeSante(): string {
    const s = this.sante();
    if (!s) return '';

    const enPanne = s.controles.filter((c) => c.etat === 'en panne');
    if (enPanne.length) {
      return `${this.majuscule(this.enumerer(enPanne.map((c) => c.quoi)))} ne répond plus.`;
    }

    // La tâche la plus en retard passe devant : c'est celle qu'on doit
    // regarder en premier, et le pluriel dilue l'urgence.
    const retard = [...s.taches]
      .filter((t) => t.inquiete)
      .sort((a, b) => this.echeance(b) - this.echeance(a))[0];

    const genes = s.controles.filter((c) => c.etat === 'dégradé');

    if (retard) {
      const depuis = retard.dernierPassage
        ? `n’est pas passé depuis ${this.ecoule(retard.dernierPassage)}`
        : 'n’est jamais passé depuis le démarrage';
      return `${retard.service} ${depuis}.`;
    }

    if (genes.length) {
      return `${this.majuscule(this.enumerer(genes.map((c) => c.quoi)))} fonctionne au ralenti.`;
    }

    return 'Tout répond. Toutes les tâches sont passées dans les temps.';
  }


  // ══════════════════════════════════════
  //  La jauge d'échéance
  // ══════════════════════════════════════
  //
  // Où en est une tâche dans l'intervalle qu'on lui accorde. C'est le
  // seul chiffre qui rende « dernier passage il y a 6 jours »
  // interprétable : reposant pour une purge quotidienne, alarmant pour
  // un import qui tourne toutes les six heures.
  //
  // Le retard de six jours sur l'import était affiché — « 6.3 j », en
  // rouge, dans une colonne de tableau, sous trois autres sections. Il
  // n'a été vu par personne. À ×12 sur une jauge qui déborde, il ne
  // pouvait pas l'être.

  /** Part de l'intervalle consommée. 1 = pile à l'échéance. */
  echeance(t: TacheSante): number {
    if (!t.dernierPassage || !t.cadenceHeures) return t.inquiete ? 99 : 0;
    const heures = (Date.now() - new Date(t.dernierPassage).getTime()) / 3_600_000;
    return heures / t.cadenceHeures;
  }

  /** La largeur du remplissage, plafonnée : au-delà, c'est le chiffre qui parle. */
  remplissage(t: TacheSante): number {
    return Math.min(100, Math.round(this.echeance(t) * 100));
  }

  /** « 38 % » tant qu'on est dans les temps, « ×12 » quand on déborde. */
  ratio(t: TacheSante): string {
    if (!t.dernierPassage) return '—';
    const e = this.echeance(t);
    return e > 1 ? `×${e < 10 ? e.toFixed(1) : Math.round(e)}` : `${Math.round(e * 100)} %`;
  }

  /** Depuis combien de temps, en clair : « 6 jours », « 40 min ». */
  ecoule(quand: string): string {
    const minutes = Math.floor((Date.now() - new Date(quand).getTime()) / 60000);
    if (minutes < 60) return `${Math.max(1, minutes)} min`;
    const heures = Math.floor(minutes / 60);
    if (heures < 48) return `${heures} h`;
    return `${Math.floor(heures / 24)} jours`;
  }

  /** La cadence, dite comme on la dirait à voix haute. */
  cadence(t: TacheSante): string {
    const h = t.cadenceHeures;
    if (!h) return '';
    if (h < 1) return `toutes les ${Math.round(h * 60)} min`;
    if (h < 48) return `toutes les ${h % 1 === 0 ? h : h.toFixed(1)} h`;
    return `tous les ${Math.round(h / 24)} jours`;
  }


  euros(centimes: number): string {
    return (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
  }




  /** « a », « a et b », « a, b et c » — on écrit en français. */
  private enumerer(noms: string[]): string {
    if (noms.length <= 1) return noms[0] ?? '';
    return `${noms.slice(0, -1).join(', ')} et ${noms[noms.length - 1]}`;
  }

  private majuscule(s: string): string {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  /**
   * Repartir de zéro sur les requêtes lentes.
   *
   * Après avoir posé l'index qui manquait, on veut savoir si la requête
   * est encore lente — pas relire un cumul qui date d'avant le correctif.
   */
  oublierLentes(): void {
    this.service.oublierRequetesLentes().subscribe({
      next: () => {
        this.toast.success('Relevé remis à zéro.');
        this.service.requetesLentes().subscribe({ next: (l) => this.lentes.set(l) });
      },
      error: () => this.toast.error('La remise à zéro a échoué.'),
    });
  }

  /**
   * Une requête écourtée, pour la lire dans une liste.
   *
   * Le texte complet fait jusqu'à huit cents caractères : il sert à
   * reconnaître la requête, pas à la rejouer.
   */
  sqlCourt(sql: string): string {
    const t = sql.replace(/\s+/g, ' ').trim();
    return t.length > 160 ? t.slice(0, 160) + ' […]' : t;
  }

  /** L'heure du relevé : une page d'exploitation doit dire sa fraîcheur. */
  readonly releve = signal<Date>(new Date());
}
