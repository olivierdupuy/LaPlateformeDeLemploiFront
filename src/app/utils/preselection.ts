/**
 * Les questions de présélection, et ce que les candidats y ont répondu.
 *
 * Les deux vivent en JSON dans deux colonnes qui ne se connaissent pas :
 * les questions sur l'offre, les réponses sur la candidature, appariées
 * par leur seul rang. C'est fragile — modifier l'ordre des questions
 * après coup décale toutes les réponses déjà reçues — mais c'est le
 * format en base, et le changer demanderait une reprise des candidatures
 * existantes. Ce module se contente de le lire sans jamais supposer
 * qu'il est bien formé : une annonce importée peut porter n'importe quoi
 * dans ce champ.
 */

export interface Reponse {
  question: string;
  reponse: string;
}

/** Rend toujours un tableau, même sur du JSON cassé. */
function tableau(json: string | null | undefined): unknown[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/**
 * Le libellé d'une question.
 *
 * Deux formats coexistent en base : une simple chaîne, et un objet
 * `{ question, idealAnswer }` introduit plus tard. Les deux se lisent.
 */
function libelle(q: unknown): string {
  if (typeof q === 'string') return q.trim();
  if (q && typeof q === 'object') {
    const o = q as Record<string, unknown>;
    const t = o['question'] ?? o['label'] ?? o['text'];
    if (typeof t === 'string') return t.trim();
  }
  return '';
}

function valeur(r: unknown): string {
  if (typeof r === 'string') return r.trim();
  if (r && typeof r === 'object') {
    const o = r as Record<string, unknown>;
    const v = o['answer'] ?? o['reponse'] ?? o['value'];
    if (typeof v === 'string') return v.trim();
  }
  return '';
}

/**
 * Apparie questions et réponses par leur rang.
 *
 * Une réponse sans question — l'offre a été modifiée depuis — est
 * écartée plutôt que rattachée à la mauvaise : mieux vaut ne rien
 * montrer que de prêter au candidat une réponse qu'il n'a pas donnée.
 */
export function reponsesDe(questionsJson?: string | null, reponsesJson?: string | null): Reponse[] {
  const questions = tableau(questionsJson).map(libelle);
  const reponses = tableau(reponsesJson).map(valeur);

  return questions
    .map((question, i) => ({ question, reponse: reponses[i] ?? '' }))
    .filter((r) => r.question.length > 0 && r.reponse.length > 0);
}

/** Le vocabulaire d'un lot de candidatures : question → réponses données. */
export function vocabulairePreselection(
  lots: { questions?: string | null; reponses?: string | null }[],
): Map<string, string[]> {
  const par = new Map<string, Set<string>>();

  for (const l of lots) {
    for (const r of reponsesDe(l.questions, l.reponses)) {
      if (!par.has(r.question)) par.set(r.question, new Set());
      par.get(r.question)!.add(r.reponse);
    }
  }

  return new Map(
    [...par.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], 'fr'))
      .map(([q, s]) => [q, [...s].sort((a, b) => a.localeCompare(b, 'fr'))]),
  );
}
