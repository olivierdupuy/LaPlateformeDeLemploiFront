import { describe, it, expect } from 'vitest';
import { renderMarkdown } from './markdown.pipe';

/**
 * Le rendu markdown des descriptions d'offres.
 *
 * C'est le seul endroit de l'application où du texte écrit par un
 * inconnu ressort en HTML, et où l'on appelle `bypassSecurityTrustHtml`.
 * Autrement dit : si l'échappement cède ici, un recruteur peut placer un
 * script dans une annonce et le faire exécuter chez chaque candidat qui
 * la consulte.
 *
 * Ces tests ne vérifient donc pas que le gras est joli. Ils vérifient
 * qu'aucune balise venue de l'extérieur ne survit, et ils sont écrits
 * comme des tentatives, pas comme des exemples.
 */
describe('renderMarkdown — échappement', () => {
  it('neutralise une balise script', () => {
    const rendu = renderMarkdown('<script>alert(1)</script>');
    expect(rendu).not.toContain('<script');
    expect(rendu).toContain('&lt;script&gt;');
  });

  it("neutralise un gestionnaire d'événement sur une balise", () => {
    const rendu = renderMarkdown('<img src=x onerror="alert(1)">');

    // Ce qui compte n'est pas que la chaîne « onerror » disparaisse —
    // elle reste, en tant que texte lisible, et c'est très bien. Ce qui
    // compte est qu'aucune balise ne se referme : sans « < » ni « > »
    // réels, il n'y a pas d'élément, donc pas d'attribut, donc rien à
    // déclencher.
    expect(rendu).not.toContain('<img');
    expect(rendu).toContain('&lt;img');
    expect(rendu).toContain('&quot;');
  });

  it('neutralise une iframe', () => {
    const rendu = renderMarkdown('<iframe src="https://exemple.test"></iframe>');
    expect(rendu).not.toContain('<iframe');
  });

  it('échappe les guillemets, qui permettraient de sortir d’un attribut', () => {
    expect(renderMarkdown('a " b')).toContain('&quot;');
  });

  it('échappe l’esperluette avant tout le reste, sans double échappement', () => {
    // « &lt; » saisi littéralement doit ressortir visible, pas devenir
    // un « < » à l'affichage : sinon l'échappement se contourne en deux
    // passes.
    expect(renderMarkdown('&lt;script&gt;')).toContain('&amp;lt;');
  });
});

describe('renderMarkdown — liens', () => {
  it('accepte un lien http et le rend inoffensif pour l’onglet appelant', () => {
    const rendu = renderMarkdown('[voir](https://exemple.test/page)');
    expect(rendu).toContain('href="https://exemple.test/page"');
    // Sans « noopener », la page ouverte peut réécrire l'onglet d'origine.
    expect(rendu).toContain('rel="noopener noreferrer"');
  });

  it('refuse un lien javascript:', () => {
    const rendu = renderMarkdown('[clic](javascript:alert(1))');
    expect(rendu).not.toContain('href="javascript:');
  });

  it('refuse un lien data:', () => {
    const rendu = renderMarkdown('[clic](data:text/html,<script>alert(1)</script>)');
    expect(rendu).not.toContain('href="data:');
  });
});

describe('renderMarkdown — mise en forme', () => {
  it('rend le gras et l’italique', () => {
    expect(renderMarkdown('**fort**')).toContain('<strong>fort</strong>');
    expect(renderMarkdown('du *penché*')).toContain('<em>penché</em>');
  });

  it('rend une liste à puces', () => {
    const rendu = renderMarkdown('- un\n- deux');
    expect(rendu).toContain('<ul>');
    expect(rendu).toContain('<li>un</li>');
    expect(rendu).toContain('<li>deux</li>');
  });

  it('rend une chaîne vide sans lever', () => {
    expect(renderMarkdown('')).toBe('');
  });
});
