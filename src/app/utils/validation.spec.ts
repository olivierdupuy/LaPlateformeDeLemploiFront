import { describe, it, expect } from 'vitest';
import { Regles } from './validation';

/**
 * Les règles de saisie, côté client.
 *
 * Elles ne remplacent pas les contrôles du serveur — rien de ce qui
 * vient du navigateur n'est digne de confiance — mais elles décident de
 * ce que la personne voit avant d'envoyer. Une règle trop stricte
 * refuse une adresse valide et fait perdre une inscription ; trop
 * laxiste, elle laisse partir une candidature vers une adresse qui
 * n'existe pas.
 */
describe('Regles.email', () => {
  it('accepte les formes courantes', () => {
    for (const v of [
      'jean@exemple.fr',
      'jean.dupont@exemple.fr',
      'jean+offres@exemple.fr',
      'j@exemple.co.uk',
      "o'brien@exemple.fr".replace("'", "'"),
      'jean-luc@sous-domaine.exemple.fr',
    ]) {
      expect(Regles.email(v), v).toBeNull();
    }
  });

  it('refuse ce qui n’est pas une adresse', () => {
    for (const v of ['jean', 'jean@', '@exemple.fr', 'jean@exemple', 'jean @exemple.fr']) {
      expect(Regles.email(v), v).not.toBeNull();
    }
  });

  it('refuse un point double, que certains serveurs rejettent en silence', () => {
    expect(Regles.email('jean..dupont@exemple.fr')).not.toBeNull();
  });

  it('refuse une adresse trop longue pour la norme', () => {
    expect(Regles.email('a'.repeat(250) + '@exemple.fr')).not.toBeNull();
  });

  it('tolère le vide quand le champ est facultatif', () => {
    expect(Regles.email('', false)).toBeNull();
    expect(Regles.email('', true)).not.toBeNull();
  });

  it('ignore les espaces autour', () => {
    expect(Regles.email('  jean@exemple.fr  ')).toBeNull();
  });
});

describe('Regles.texteCourt', () => {
  it('refuse les chevrons, comme le serveur', () => {
    expect(Regles.texteCourt('<b>Paris</b>', 'La ville')).not.toBeNull();
  });

  it('refuse en deçà du minimum et au-delà du maximum', () => {
    expect(Regles.texteCourt('a', 'Le nom')).not.toBeNull();
    expect(Regles.texteCourt('a'.repeat(101), 'Le nom')).not.toBeNull();
  });

  it('accepte un nom ordinaire, accents et traits d’union compris', () => {
    expect(Regles.texteCourt('Jean-Luc Périé', 'Le nom')).toBeNull();
  });

  it('tolère le vide quand le champ est facultatif', () => {
    expect(Regles.texteCourt('', 'Le nom', { obligatoire: false })).toBeNull();
  });
});

describe('Regles.motDePasse', () => {
  it('exige huit caractères, et rien d’autre', () => {
    // Les classes de caractères obligatoires produisent « Password1! » :
    // le même mot de passe que tout le monde. C'est la longueur qui
    // résiste, et le serveur applique la même règle.
    expect(Regles.motDePasse('1234567')).not.toBeNull();
    expect(Regles.motDePasse('correcte cheval batterie agrafe')).toBeNull();
    expect(Regles.motDePasse('motdepasse')).toBeNull();
  });

  it('refuse le vide et l’excessivement long', () => {
    expect(Regles.motDePasse('')).not.toBeNull();
    expect(Regles.motDePasse('a'.repeat(129))).not.toBeNull();
  });
});

describe('Regles.requis', () => {
  it('ne se laisse pas berner par des espaces', () => {
    expect(Regles.requis('   ', 'Le titre')).not.toBeNull();
    expect(Regles.requis('Titre', 'Le titre')).toBeNull();
  });
});
