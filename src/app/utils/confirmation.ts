import Swal from 'sweetalert2';

/**
 * Demander confirmation, une seule fois pour toute l'application.
 *
 * Deux motifs coexistaient. Une trentaine d'écrans appelaient
 * `Swal.fire` avec leurs propres libellés et leurs propres couleurs
 * écrites en dur ; treize autres appelaient le `confirm()` du
 * navigateur. Ce dernier a trois défauts qu'on ne rattrape pas :
 *
 *   Il bloque le fil d'exécution et gèle l'onglet entier.
 *
 *   Il s'affiche avec le chrome du navigateur, en haut de la fenêtre,
 *   sans rapport visuel avec l'écran qui l'a demandé — et sous Chrome,
 *   avec une case « empêcher ce site d'ouvrir d'autres boîtes » qui
 *   désarme silencieusement toutes les confirmations suivantes.
 *
 *   Il ne dit rien de la gravité du geste. « Supprimer cette note ? » et
 *   « Supprimer définitivement ce compte ? » y ont la même tête.
 *
 * Les couleurs viennent des jetons de la feuille globale plutôt que du
 * code : les valeurs recopiées dans les appels existants dataient de
 * l'identité précédente, et le gris d'annulation n'appartenait déjà plus
 * à la palette.
 */
function jeton(nom: string, repli: string): string {
  if (typeof document === 'undefined') return repli;
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim() || repli;
}

export interface DemandeConfirmation {
  titre: string;
  /** Texte simple. Échappé par la bibliothèque. */
  texte?: string;
  /** Contenu riche, quand une liste ou une mise en garde le justifie. */
  html?: string;
  /** Libellé du bouton qui engage. « Confirmer » par défaut. */
  confirmer?: string;
  annuler?: string;
  /**
   * Geste destructeur : le bouton passe au rouge de danger et l'icône
   * devient un avertissement. C'est la seule différence, et elle suffit
   * — un bouton rouge ne se clique pas au même rythme qu'un bouton bleu.
   */
  danger?: boolean;
}

export async function confirmer(demande: DemandeConfirmation): Promise<boolean> {
  const resultat = await Swal.fire({
    title: demande.titre,
    text: demande.html ? undefined : demande.texte,
    html: demande.html,
    icon: demande.danger ? 'warning' : 'question',
    showCancelButton: true,
    confirmButtonColor: demande.danger ? jeton('--danger', '#C62B44') : jeton('--bleu-600', '#01489C'),
    cancelButtonColor: jeton('--ink-soft', '#4C596E'),
    confirmButtonText: demande.confirmer ?? 'Confirmer',
    cancelButtonText: demande.annuler ?? 'Annuler',
    // Le bouton d'annulation prend le focus : sur un geste destructeur,
    // une validation au clavier par réflexe ne doit pas détruire.
    focusCancel: demande.danger === true,
  });

  return resultat.isConfirmed;
}

export interface DemandeSaisie {
  titre: string;
  texte?: string;
  /** Ce qui s'affiche dans le champ vide, pour montrer la forme attendue. */
  exemple?: string;
  type?: 'text' | 'url' | 'email';
  confirmer?: string;
  /** Rend un message d'erreur quand la saisie ne convient pas, sinon rien. */
  verifier?: (valeur: string) => string | null;
}

/**
 * Demander une valeur, en remplacement de `prompt()`.
 *
 * Même raison que ci-dessus, plus une : le `prompt()` du navigateur ne
 * sait pas refuser une saisie. Une adresse de webhook en « http:// » y
 * était acceptée, partait au serveur, et revenait en erreur — la
 * vérification se fait ici, sans aller-retour.
 *
 * Rend la valeur saisie, ou `null` si l'on renonce.
 */
export async function demanderTexte(demande: DemandeSaisie): Promise<string | null> {
  const resultat = await Swal.fire({
    title: demande.titre,
    text: demande.texte,
    input: demande.type ?? 'text',
    inputPlaceholder: demande.exemple,
    showCancelButton: true,
    confirmButtonColor: jeton('--bleu-600', '#01489C'),
    cancelButtonColor: jeton('--ink-soft', '#4C596E'),
    confirmButtonText: demande.confirmer ?? 'Valider',
    cancelButtonText: 'Annuler',
    inputValidator: (valeur: string) => {
      const propre = (valeur ?? '').trim();
      if (!propre) return 'Ce champ est requis.';
      return demande.verifier?.(propre) ?? null;
    },
  });

  const valeur = typeof resultat.value === 'string' ? resultat.value.trim() : '';
  return resultat.isConfirmed && valeur ? valeur : null;
}
