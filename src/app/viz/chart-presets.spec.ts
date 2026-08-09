import { Chart } from 'chart.js';
import { describe, expect, it } from 'vitest';
import { applyChartDefaults } from './chart-presets';

/**
 * Les réglages globaux de Chart.js.
 *
 * Un seul de ces tests compte vraiment, et il porte sur un défaut qui
 * ne se voit ni à la compilation, ni au premier rendu : les graphiques
 * s'affichaient correctement et ne cassaient qu'au **redessin** —
 * survol, mise à jour des données, descente dans un graphique — avec
 * un message qui ne désigne rien : « this._fn is not a function ».
 *
 * La cause était un `Chart.defaults.animation = {…}` qui remplaçait
 * l'objet au lieu de le compléter. Le coût de la rechute est élevé et
 * l'écriture fautive est plus courte que la bonne : elle reviendra si
 * rien ne la retient.
 */
describe('applyChartDefaults', () => {
  /**
   * Le type déclaré est « false | AnimationSpec ». Poser `false` est
   * justement la faute que ces tests surveillent, alors on commence par
   * refuser ce cas — un `animation` désactivé ferait passer les
   * assertions suivantes pour de mauvaises raisons.
   */
  function animation() {
    applyChartDefaults();
    const a = Chart.defaults.animation;
    expect(a, 'Chart.defaults.animation ne doit pas être « false »').toBeTruthy();
    return a as Exclude<typeof a, false>;
  }

  it('conserve les clefs d’animation de Chart.js', () => {
    // C'est cette liste que Chart.js parcourt pour recopier la
    // spécification de chaque animation. Ce qui n'y figure pas est
    // perdu en silence.
    const clefs = Object.keys(animation());

    for (const attendue of ['delay', 'duration', 'easing', 'fn', 'from', 'loop', 'to', 'type']) {
      expect(clefs, `« ${attendue} » a disparu de Chart.defaults.animation`).toContain(attendue);
    }
  });

  it('laisse l’animation des couleurs déclarer son type', () => {
    // La reconstitution exacte de ce que fait « Animations.configure » :
    // sans « type », l'interpolateur retenu serait « interpolators[typeof
    // '#01489C'] », c'est-à-dire « interpolators['string'] », qui
    // n'existe pas — Chart.js n'en connaît que trois : boolean, color
    // et number.
    const options = Object.keys(animation());
    const couleurs = Chart.defaults.animations['colors'] as Record<string, unknown>;

    const resolue: Record<string, unknown> = {};
    for (const o of options) resolue[o] = couleurs[o];

    expect(resolue['type']).toBe('color');
  });

  it('applique bien la durée et la souplesse voulues', () => {
    const a = animation();

    expect(a.duration).toBe(420);
    expect(a.easing).toBe('easeOutQuart');
  });

  it('pose la typographie et les couleurs du site', () => {
    applyChartDefaults();

    expect(Chart.defaults.font.family).toContain('Nunito Sans');
    expect(Chart.defaults.maintainAspectRatio).toBe(false);
    expect(Chart.defaults.responsive).toBe(true);
  });
});
