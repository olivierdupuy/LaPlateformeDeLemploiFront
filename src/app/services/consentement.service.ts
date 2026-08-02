import { Injectable, computed, signal } from '@angular/core';

/**
 * Les finalités, et rien d'autre.
 *
 * Le RGPD ne demande pas un consentement « aux cookies » : il demande
 * un consentement **par finalité**, parce que c'est la finalité qui
 * justifie le traitement, jamais la technique employée pour le mener.
 * Accepter d'être compté n'est pas accepter d'être suivi, et un bandeau
 * qui confond les deux ne recueille rien de valable.
 */
export type Finalite = 'necessaire' | 'mesure' | 'confort';

export interface DefinitionFinalite {
  cle: Finalite;
  titre: string;
  /** Ce qui se passe si c'est accepté. Au présent, sans conditionnel. */
  effet: string;
  /** Ce qui se perd si c'est refusé. Vide pour le strict nécessaire. */
  sansQuoi: string;
  /** Le nécessaire ne se refuse pas : le dire plutôt que griser une case. */
  obligatoire: boolean;
}

export const FINALITES: DefinitionFinalite[] = [
  {
    cle: 'necessaire',
    titre: 'Strict nécessaire',
    effet:
      'Votre session, le jeton anti-falsification des formulaires et le choix '
      + 'que vous faites ici. Rien de tout cela ne quitte le site.',
    sansQuoi: '',
    obligatoire: true,
  },
  {
    cle: 'mesure',
    titre: 'Mesure d’audience',
    effet:
      'Compte les pages vues, sans identifiant publicitaire, sans profilage, '
      + 'et sans transmettre quoi que ce soit à un tiers.',
    sansQuoi: 'Nous ne saurons pas quelles pages servent, ni lesquelles échouent.',
    obligatoire: false,
  },
  {
    cle: 'confort',
    titre: 'Confort de navigation',
    effet:
      'Retient vos recherches récentes, vos favoris et l’état de vos filtres '
      + 'entre deux visites.',
    sansQuoi: 'Vos filtres et vos recherches repartiront de zéro à chaque visite.',
    obligatoire: false,
  },
];

/** Ce qui est écrit dans le navigateur. */
interface ChoixEnregistre {
  version: number;
  date: string;
  mesure: boolean;
  confort: boolean;
}

const CLE = 'consentement_finalites';

/**
 * La version du bandeau.
 *
 * Elle est relue au démarrage : si les finalités changent — une de plus,
 * une reformulée sur le fond — le choix précédent ne porte plus sur la
 * même chose, et il faut le redemander. Sans ce numéro, ajouter une
 * finalité reviendrait à la faire accepter par un consentement donné
 * avant qu'elle n'existe.
 */
const VERSION = 1;

/** L'ancienne clé binaire, à convertir une fois puis à oublier. */
const CLE_HERITEE = 'cookie_consent';

@Injectable({ providedIn: 'root' })
export class Consentement {
  private readonly choix = signal<ChoixEnregistre | null>(null);

  /** Vrai tant que la personne n'a rien choisi pour cette version. */
  readonly aRepondre = computed(() => this.choix() === null);

  readonly mesureAutorisee = computed(() => this.choix()?.mesure === true);
  readonly confortAutorise = computed(() => this.choix()?.confort === true);

  /** La date du choix, pour la page « Cookies » — la preuve se montre. */
  readonly dateDuChoix = computed(() => this.choix()?.date ?? null);

  autorise(finalite: Finalite): boolean {
    if (finalite === 'necessaire') return true;
    if (finalite === 'mesure') return this.mesureAutorisee();
    return this.confortAutorise();
  }

  /** Enregistre un choix explicite, finalité par finalité. */
  enregistrer(mesure: boolean, confort: boolean): void {
    const choix: ChoixEnregistre = {
      version: VERSION,
      date: new Date().toISOString(),
      mesure,
      confort,
    };

    this.choix.set(choix);

    // Navigation privée, stockage plein, stockage refusé : le choix ne
    // se retient pas et le bandeau reviendra. Ce n'est pas une raison
    // pour casser la page — ni pour supposer un accord.
    try {
      localStorage.setItem(CLE, JSON.stringify(choix));
      localStorage.removeItem(CLE_HERITEE);
    } catch { /* choix non mémorisé */ }
  }

  /**
   * Rouvre la question.
   *
   * Retirer son consentement doit être aussi simple que de le donner —
   * c'est la formule du RGPD, et elle est prise au mot : la page
   * « Cookies » appelle ceci, le bandeau revient, et il revient avec
   * les choix précédents déjà cochés.
   */
  revenirSurLeChoix(): void {
    this.choix.set(null);
    try { localStorage.removeItem(CLE); } catch { /* rien à retirer */ }
  }

  /**
   * Le dernier état connu, pour pré-remplir le bandeau à sa réouverture.
   *
   * Tout à faux par défaut. Une case cochée d'avance n'enregistre pas un
   * accord : elle enregistre l'absence de refus, ce qui n'est pas la
   * même chose et ne vaut rien juridiquement. Ce n'est repris à vrai
   * que sur un choix que la personne a réellement rendu — le sien,
   * précédemment.
   */
  readonly dernierEtat = signal<{ mesure: boolean; confort: boolean }>({
    mesure: false,
    confort: false,
  });

  /**
   * La relecture se fait ici, et non dans l'initialisation des champs.
   *
   * Elle y était, et c'était un défaut que les tests ont trouvé :
   * `relire()` écrivait dans `dernierEtat`, déclaré *après* `choix`
   * dans la classe. Au moment de l'appel le champ valait `undefined`,
   * l'accès levait, et le `catch` — posé pour un stockage indisponible
   * — avalait l'erreur en rendant `null`. Résultat : tout choix
   * enregistré était oublié au rechargement suivant, et le bandeau
   * revenait à chaque visite. Aucun écran ne le signalait ; seul un
   * test pouvait le voir.
   */
  constructor() {
    const { choix, dernier } = this.relire();
    this.choix.set(choix);
    if (dernier) this.dernierEtat.set(dernier);
  }

  private relire(): {
    choix: ChoixEnregistre | null;
    dernier: { mesure: boolean; confort: boolean } | null;
  } {
    try {
      const brut = localStorage.getItem(CLE);
      if (brut) {
        const lu = JSON.parse(brut) as ChoixEnregistre;
        // Un choix rendu sur une version antérieure des finalités ne
        // vaut pas pour celles-ci.
        if (lu?.version !== VERSION) return { choix: null, dernier: null };
        return {
          choix: lu,
          dernier: { mesure: !!lu.mesure, confort: !!lu.confort },
        };
      }

      // ── Reprise de l'ancien bandeau ──
      //
      // Il était binaire, et disait « aucune mesure d'audience ». Un
      // « j'ai compris » donné à cette phrase-là n'autorise donc pas la
      // mesure : on ne reprend que le confort, et on redemande le reste.
      // Le convertir en accord complet serait fabriquer un consentement
      // que personne n'a donné.
      if (localStorage.getItem(CLE_HERITEE) === 'accepted') {
        return { choix: null, dernier: { mesure: false, confort: true } };
      }

      return { choix: null, dernier: null };
    } catch {
      return { choix: null, dernier: null };
    }
  }
}
