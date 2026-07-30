/**
 * Questions de presélection d'une offre.
 *
 * Le recruteur les compose au dépôt de l'offre, le candidat y répond dans le
 * tunnel de candidature. Elles sont stockées en JSON dans `JobOffer.screeningQuestions`.
 *
 * Deux formats coexistent :
 *  - historique  : `["Avez-vous le permis B ?", ...]` (simple tableau de chaînes)
 *  - actuel      : `[{ text, type, options, required, idealAnswer }, ...]`
 *
 * La lecture accepte les deux ; l'écriture produit toujours le format actuel.
 */
export type ScreeningType = 'text' | 'boolean' | 'number' | 'choice';

export interface ScreeningQuestion {
  text: string;
  type: ScreeningType;
  /** Réponses proposées, pour le type « choice ». */
  options: string[];
  required: boolean;
  /** Réponse attendue par le recruteur : sert à mesurer l'adéquation du candidat. */
  idealAnswer?: string;
}

export const SCREENING_TYPE_LABELS: Record<ScreeningType, string> = {
  text: 'Réponse libre',
  boolean: 'Oui / Non',
  number: 'Nombre',
  choice: 'Choix multiple',
};

export function emptyQuestion(): ScreeningQuestion {
  return { text: '', type: 'text', options: [], required: true, idealAnswer: '' };
}

/** Réponses possibles présentées au candidat, selon le type de question. */
export function answerOptions(q: ScreeningQuestion): string[] {
  if (q.type === 'boolean') return ['Oui', 'Non'];
  if (q.type === 'choice') return q.options.filter((o) => o.trim().length > 0);
  return [];
}

export function parseScreeningQuestions(json?: string | null): ScreeningQuestion[] {
  if (!json) return [];
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item): ScreeningQuestion | null => {
      // Format historique : la question tenait dans une simple chaîne.
      if (typeof item === 'string') {
        return item.trim() ? { ...emptyQuestion(), text: item.trim() } : null;
      }
      if (!item || typeof item !== 'object') return null;
      const o = item as Record<string, unknown>;
      const text = String(o['text'] ?? o['question'] ?? '').trim();
      if (!text) return null;
      const type = (['text', 'boolean', 'number', 'choice'] as const).includes(o['type'] as ScreeningType)
        ? (o['type'] as ScreeningType)
        : 'text';
      return {
        text,
        type,
        options: Array.isArray(o['options']) ? (o['options'] as unknown[]).map(String) : [],
        required: o['required'] !== false,
        idealAnswer: o['idealAnswer'] ? String(o['idealAnswer']) : '',
      };
    })
    .filter((q): q is ScreeningQuestion => q !== null);
}

/** Sérialise pour l'API. Renvoie `null` s'il ne reste aucune question exploitable. */
export function serializeScreeningQuestions(questions: ScreeningQuestion[]): string | null {
  const clean = questions
    .map((q) => ({
      text: q.text.trim(),
      type: q.type,
      options: q.type === 'choice' ? q.options.map((o) => o.trim()).filter(Boolean) : [],
      required: q.required,
      idealAnswer: (q.idealAnswer || '').trim() || undefined,
    }))
    .filter((q) => q.text.length > 0);
  return clean.length ? JSON.stringify(clean) : null;
}

export interface ScreeningAnswer {
  question: string;
  answer: string;
}

export function parseScreeningAnswers(json?: string | null): ScreeningAnswer[] {
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((a) => a && typeof a === 'object')
      .map((a) => ({ question: String(a.question ?? ''), answer: String(a.answer ?? '') }));
  } catch {
    return [];
  }
}
