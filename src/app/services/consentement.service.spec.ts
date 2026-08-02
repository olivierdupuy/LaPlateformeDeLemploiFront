import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import { Consentement } from './consentement.service';

/**
 * Le consentement.
 *
 * C'est une des rares mécaniques dont un défaut ne se voit jamais à
 * l'usage : un refus mal enregistré se traduit par une mesure qui part
 * quand même, et rien à l'écran ne le signale. Le seul endroit où cela
 * se découvre est un contrôle de la CNIL.
 *
 * `localStorage` est vidé entre chaque test, et le service reconstruit :
 * il lit le stockage à sa création, une instance conservée d'un test à
 * l'autre porterait l'état du précédent.
 */
function service(): Consentement {
  TestBed.resetTestingModule();
  return TestBed.inject(Consentement);
}

describe('Consentement', () => {
  beforeEach(() => localStorage.clear());

  it('demande une réponse tant que rien n’a été choisi', () => {
    expect(service().aRepondre()).toBe(true);
  });

  it('ne suppose aucun accord avant réponse', () => {
    const c = service();
    expect(c.mesureAutorisee()).toBe(false);
    expect(c.confortAutorise()).toBe(false);
    expect(c.autorise('mesure')).toBe(false);
    expect(c.autorise('confort')).toBe(false);
  });

  it('laisse toujours passer le strict nécessaire', () => {
    // Il ne se refuse pas : sans lui il n'y a pas de session, donc pas
    // de site. Le dire vaut mieux que griser une case.
    expect(service().autorise('necessaire')).toBe(true);
  });

  it('retient un refus, et ne repose pas la question', () => {
    const c = service();
    c.enregistrer(false, false);

    expect(c.aRepondre()).toBe(false);
    expect(c.mesureAutorisee()).toBe(false);

    // Un refus enregistré doit survivre au rechargement, au même titre
    // qu'un accord. Sans cela le bandeau revient à chaque page et la
    // fatigue finit par produire le « oui » qu'on n'a pas obtenu.
    expect(service().aRepondre()).toBe(false);
    expect(service().mesureAutorisee()).toBe(false);
  });

  it('retient un accord partiel sans le généraliser', () => {
    service().enregistrer(false, true);

    const relu = service();
    expect(relu.mesureAutorisee()).toBe(false);
    expect(relu.confortAutorise()).toBe(true);
  });

  it('horodate le choix', () => {
    const c = service();
    c.enregistrer(true, true);

    const quand = c.dateDuChoix();
    expect(quand).toBeTruthy();
    expect(Number.isNaN(Date.parse(quand!))).toBe(false);
  });

  it('rouvre la question sur demande, sans rien présumer', () => {
    const c = service();
    c.enregistrer(true, true);
    c.revenirSurLeChoix();

    expect(c.aRepondre()).toBe(true);
    expect(c.mesureAutorisee()).toBe(false);
    expect(service().aRepondre()).toBe(true);
  });

  it('redemande quand la version des finalités a changé', () => {
    // Un choix rendu sur une liste de finalités ne vaut pas pour une
    // autre : ajouter une finalité ne doit pas la faire accepter par
    // un consentement donné avant qu'elle n'existe.
    localStorage.setItem(
      'consentement_finalites',
      JSON.stringify({ version: 0, date: '2026-01-01T00:00:00Z', mesure: true, confort: true }),
    );

    const c = service();
    expect(c.aRepondre()).toBe(true);
    expect(c.mesureAutorisee()).toBe(false);
  });

  it('ne convertit pas l’ancien bandeau en accord à la mesure', () => {
    // L'ancien bandeau était binaire et annonçait « aucun outil de
    // mesure d'audience ». Un « j'ai compris » donné à cette phrase-là
    // n'autorise pas la mesure — la reprendre à vrai fabriquerait un
    // consentement que personne n'a donné.
    localStorage.setItem('cookie_consent', 'accepted');

    const c = service();
    expect(c.aRepondre()).toBe(true);
    expect(c.mesureAutorisee()).toBe(false);
    expect(c.dernierEtat().mesure).toBe(false);
    expect(c.dernierEtat().confort).toBe(true);
  });

  it('survit à un stockage illisible', () => {
    localStorage.setItem('consentement_finalites', '{ceci n’est pas du JSON');

    const c = service();
    expect(c.aRepondre()).toBe(true);
    expect(c.mesureAutorisee()).toBe(false);
  });
});
