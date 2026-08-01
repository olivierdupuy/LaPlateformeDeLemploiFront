/**
 * Les règles de saisie, dites une seule fois.
 *
 * Elles ne remplacent pas celles du serveur — c'est lui qui décide, et
 * lui seul : tout ce qui est ici se contourne avec la console du
 * navigateur. Elles évitent l'aller-retour, et surtout elles répondent
 * pendant la frappe, là où corriger ne coûte rien. Apprendre au moment
 * de valider qu'un champ était mauvais fait relire tout le formulaire.
 *
 * Chaque règle rend la phrase à afficher, ou `null` si tout va bien —
 * de quoi écrire `@if (erreur) { … }` sans rien interpréter.
 *
 * Les seuils suivent ceux du serveur (`Validation/Contraintes.cs`). Les
 * désaccorder ferait accepter ici ce qui serait refusé là-bas, ce qui
 * est pire que de ne rien contrôler du tout.
 */

/** Même expression que le serveur : un domaine, une extension, pas de balisage. */
const ADRESSE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.\-]+@[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9\-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/;

export const Regles = {
  requis(valeur: string | null | undefined, quoi: string): string | null {
    return (valeur ?? '').trim() ? null : `${quoi} est nécessaire.`;
  },

  email(valeur: string | null | undefined, obligatoire = true): string | null {
    const v = (valeur ?? '').trim();
    if (!v) return obligatoire ? 'Indiquez votre adresse e-mail.' : null;
    if (v.length > 254) return 'Cette adresse est trop longue.';
    if (v.includes('..')) return 'Cette adresse e-mail ne semble pas valide.';
    return ADRESSE.test(v) ? null : 'Cette adresse e-mail ne semble pas valide.';
  },

  /**
   * Un nom, une ville, un intitulé.
   *
   * Les chevrons sont refusés ici comme au serveur : ce champ n'attend
   * pas de balisage, et une personne qui en dépose sciemment mérite de
   * l'apprendre tout de suite plutôt que de croire y être parvenue.
   */
  texteCourt(valeur: string | null | undefined, quoi: string,
             { min = 2, max = 100, obligatoire = true } = {}): string | null {
    const v = (valeur ?? '').trim();
    if (!v) return obligatoire ? `${quoi} est nécessaire.` : null;
    if (v.length < min) return `${quoi} fait au moins ${min} caractères.`;
    if (v.length > max) return `${quoi} ne peut pas dépasser ${max} caractères.`;
    if (v.includes('<') || v.includes('>')) return 'Les caractères « < » et « > » ne sont pas acceptés ici.';
    return null;
  },

  motDePasse(valeur: string | null | undefined): string | null {
    const v = valeur ?? '';
    if (!v) return 'Choisissez un mot de passe.';
    if (v.length < 8) return 'Huit caractères au minimum.';
    if (v.length > 128) return 'Ce mot de passe est trop long.';
    return null;
  },

  /** Un mobile français, sous n'importe quelle écriture courante. */
  telephone(valeur: string | null | undefined, obligatoire = false): string | null {
    const brut = (valeur ?? '').trim();
    if (!brut) return obligatoire ? 'Indiquez votre numéro de mobile.' : null;
    let chiffres = brut.replace(/\D/g, '');
    if (brut.startsWith('+33')) chiffres = '0' + chiffres.slice(2);
    if (chiffres.length !== 10 || chiffres[0] !== '0' || chiffres[1] === '0')
      return 'Ce numéro ne semble pas valide. Exemple : 06 12 34 56 78.';
    return null;
  },

  /** Six chiffres, ou un code de secours. */
  code(valeur: string | null | undefined): string | null {
    const v = (valeur ?? '').replace(/[\s-]/g, '');
    if (!v) return 'Saisissez le code reçu.';
    if (v.length < 6) return 'Un code compte six chiffres.';
    if (v.length > 20) return 'Ce code est trop long.';
    return null;
  },

  /** Une adresse web, et seulement en http ou https. */
  lien(valeur: string | null | undefined): string | null {
    const v = (valeur ?? '').trim();
    if (!v) return null;
    if (v.length > 500) return 'Cette adresse est trop longue.';
    try {
      const u = new URL(v);
      if (u.protocol !== 'http:' && u.protocol !== 'https:')
        return 'L’adresse doit commencer par http:// ou https://.';
      if (!u.hostname.includes('.')) return 'Cette adresse web ne semble pas valide.';
      return null;
    } catch {
      return 'Indiquez une adresse complète, commençant par http:// ou https://.';
    }
  },
};

/**
 * Ce que le serveur a refusé, champ par champ.
 *
 * Il répond « erreurs » indexé par nom de champ. Sans cette lecture, un
 * refus venu du serveur n'aurait qu'un message global, et l'on
 * chercherait lequel des huit champs il vise.
 */
export function erreursDuServeur(e: unknown): Record<string, string> {
  const brut = (e as { error?: { erreurs?: Record<string, string[]> } })?.error?.erreurs;
  if (!brut) return {};
  return Object.fromEntries(
    Object.entries(brut).map(([champ, liste]) => [champ, liste?.[0] ?? '']),
  );
}
