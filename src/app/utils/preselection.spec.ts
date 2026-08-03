import { describe, expect, it } from 'vitest';
import { reponsesDe, vocabulairePreselection } from './preselection';

/**
 * La lecture des questions de présélection.
 *
 * Deux colonnes JSON qui ne se connaissent pas — les questions sur
 * l'offre, les réponses sur la candidature — appariées par leur seul
 * rang. Tout ce qui suit protège la même chose : ne jamais prêter à un
 * candidat une réponse qu'il n'a pas donnée.
 *
 * Ces champs viennent aussi d'annonces importées, que personne chez nous
 * n'a écrites. Un JSON cassé ne doit pas vider l'écran des candidatures.
 */
describe('reponsesDe', () => {
  it('apparie une question et sa réponse', () => {
    const r = reponsesDe(
      JSON.stringify(['Avez-vous le permis ?']),
      JSON.stringify([{ answer: 'Oui' }]),
    );
    expect(r).toEqual([{ question: 'Avez-vous le permis ?', reponse: 'Oui' }]);
  });

  it('lit aussi le format objet des questions', () => {
    // Le format a changé en cours de route : une simple chaîne au début,
    // puis « { question, idealAnswer } ». Les deux sont en base.
    const r = reponsesDe(
      JSON.stringify([{ question: 'Années d’expérience ?', idealAnswer: '5' }]),
      JSON.stringify([{ answer: '7' }]),
    );
    expect(r).toEqual([{ question: 'Années d’expérience ?', reponse: '7' }]);
  });

  it('écarte une question restée sans réponse', () => {
    // L'offre a gagné une question après le dépôt. La rendre avec une
    // réponse vide laisserait croire que le candidat n'a rien répondu,
    // alors qu'on ne lui a jamais posé la question.
    const r = reponsesDe(
      JSON.stringify(['Permis ?', 'Mobilité ?']),
      JSON.stringify([{ answer: 'Oui' }]),
    );
    expect(r).toHaveLength(1);
    expect(r[0].question).toBe('Permis ?');
  });

  it('écarte une réponse devenue orpheline', () => {
    // L'offre a perdu une question. La réponse restante ne désigne plus
    // rien : la rattacher à la question suivante inventerait un propos.
    const r = reponsesDe(
      JSON.stringify(['Permis ?']),
      JSON.stringify([{ answer: 'Oui' }, { answer: 'Non' }]),
    );
    expect(r).toEqual([{ question: 'Permis ?', reponse: 'Oui' }]);
  });

  it('ne rend rien sur du JSON cassé plutôt que de lever', () => {
    // Une annonce importée peut porter n'importe quoi dans ce champ, et
    // une exception ici viderait toute la page des candidatures.
    expect(reponsesDe('{pas du json', '[]')).toEqual([]);
    expect(reponsesDe('"une chaine"', '[]')).toEqual([]);
    expect(reponsesDe(null, undefined)).toEqual([]);
  });

  it('ignore les questions et réponses vides', () => {
    const r = reponsesDe(
      JSON.stringify(['   ', 'Permis ?']),
      JSON.stringify([{ answer: 'x' }, { answer: '  ' }]),
    );
    expect(r).toEqual([]);
  });
});

describe('vocabulairePreselection', () => {
  it('regroupe les réponses par question, sans doublon', () => {
    const v = vocabulairePreselection([
      { questions: JSON.stringify(['Permis ?']), reponses: JSON.stringify([{ answer: 'Oui' }]) },
      { questions: JSON.stringify(['Permis ?']), reponses: JSON.stringify([{ answer: 'Oui' }]) },
      { questions: JSON.stringify(['Permis ?']), reponses: JSON.stringify([{ answer: 'Non' }]) },
    ]);

    expect([...v.keys()]).toEqual(['Permis ?']);
    expect(v.get('Permis ?')).toEqual(['Non', 'Oui']);
  });

  it('range les questions dans l’ordre français', () => {
    const v = vocabulairePreselection([
      { questions: JSON.stringify(['Zone ?', 'Équipement ?']), reponses: JSON.stringify([{ answer: 'a' }, { answer: 'b' }]) },
    ]);
    // « Équipement » avant « Zone » : sans comparaison française, l'accent
    // renverrait le mot en fin de liste.
    expect([...v.keys()]).toEqual(['Équipement ?', 'Zone ?']);
  });
});
