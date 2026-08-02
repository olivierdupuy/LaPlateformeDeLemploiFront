import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Consentement, Finalite, FINALITES } from '../../services/consentement.service';

/**
 * Le bandeau de consentement.
 *
 * Il était binaire — un seul bouton, « J'ai compris » — et c'était
 * honnête tant qu'il n'y avait rien à consentir : le site n'employait
 * aucun traceur, et la phrase le disait. Une mesure d'audience change
 * cela. Dès qu'une finalité est facultative, le consentement doit se
 * donner **finalité par finalité** : c'est ce que demande le RGPD, et
 * ce n'est pas une formalité — accepter d'être compté n'est pas
 * accepter d'être suivi.
 *
 * Trois principes, tenus dans la mise en forme autant que dans le code :
 *
 *   **Refuser coûte un clic, comme accepter.** Les deux boutons ont le
 *   même poids visuel. Un « tout accepter » en couleur vive à côté d'un
 *   « paramétrer » en gris est un consentement extorqué par la fatigue,
 *   et la CNIL le dit depuis 2020.
 *
 *   **Aucune case n'est pré-cochée à la hausse.** La mesure d'audience
 *   part décochée. Une case cochée d'avance ne recueille rien : elle
 *   enregistre l'absence de refus, ce qui n'est pas la même chose.
 *
 *   **On dit ce qui se perd.** Chaque finalité annonce son effet et son
 *   absence d'effet. « Vos filtres repartiront de zéro » vaut mieux
 *   qu'un nom de catégorie que personne ne sait interpréter.
 */
@Component({
  selector: 'app-cookie-consent',
  imports: [RouterLink],
  standalone: true,
  template: `
    @if (consentement.aRepondre()) {
      <div class="cc-banner" role="dialog" aria-labelledby="cc-title" aria-modal="false">
        <div class="cc-inner">
          <div class="cc-text">
            <strong id="cc-title">Vos choix</strong>
            <p>
              Ce site n'emploie aucun traceur publicitaire et ne transmet rien à un tiers.
              Deux usages restent à votre main.
              <a routerLink="/cookies">En savoir plus</a>
            </p>
          </div>

          @if (detaille()) {
            <fieldset class="cc-finalites">
              <legend class="sr-only">Finalités</legend>
              @for (f of finalites; track f.cle) {
                <label class="cc-fin" [class.cc-fin--fige]="f.obligatoire">
                  <input type="checkbox"
                         [checked]="coche(f.cle)"
                         [disabled]="f.obligatoire"
                         (change)="basculer(f.cle, $event)" />
                  <span class="cc-fin__txt">
                    <b>{{ f.titre }}</b>
                    <span>{{ f.effet }}</span>
                    @if (f.sansQuoi) { <em>Si vous refusez : {{ f.sansQuoi }}</em> }
                  </span>
                </label>
              }
            </fieldset>
          }

          <div class="cc-actions">
            @if (!detaille()) {
              <button class="cc-btn" (click)="detaille.set(true)">Choisir</button>
            }
            <button class="cc-btn" (click)="toutRefuser()">Tout refuser</button>
            @if (detaille()) {
              <button class="cc-btn cc-btn--fort" (click)="enregistrerLeChoix()">
                Enregistrer mes choix
              </button>
            } @else {
              <button class="cc-btn cc-btn--fort" (click)="toutAccepter()">Tout accepter</button>
            }
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    /* Encart prune posé sur le contenu — même chrome que la navbar. */
    .cc-banner {
      position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 900;
      max-width: 940px; margin: 0 auto;
      background: var(--plum-900); color: #fff;
      border: 1px solid rgba(232, 239, 250, 0.12);
      border-radius: var(--r-lg);
      box-shadow: var(--shadow-xl);
      animation: ccup 0.35s cubic-bezier(0.16, 1, 0.3, 1) both;
      max-height: 86dvh; overflow-y: auto;
    }
    @keyframes ccup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    @media (prefers-reduced-motion: reduce) { .cc-banner { animation: none; } }

    .cc-inner { display: flex; align-items: center; gap: 1.75rem; padding: 1.15rem 1.4rem; flex-wrap: wrap; }
    .cc-text { flex: 1; min-width: 260px; }
    .cc-text strong {
      display: block;
      font-family: var(--font-mono); font-size: 0.58rem; font-weight: 500;
      text-transform: uppercase; letter-spacing: 0.14em;
      color: var(--citron);
    }
    .cc-text p {
      font-size: 0.85rem; line-height: 1.55; margin-top: 0.4rem;
      color: var(--on-plum-muted); max-width: 64ch;
    }
    .cc-text a { color: #fff; text-decoration: underline; text-underline-offset: 2px; }
    .cc-text a:hover { color: var(--bleu-300); }

    /* ── Les finalités ── */
    .cc-finalites {
      width: 100%; border: 0; padding: 0; margin: 0;
      display: grid; gap: 0.65rem;
      border-top: 1px solid rgba(232, 239, 250, 0.14);
      padding-top: 1rem;
    }
    .cc-fin {
      display: flex; gap: 0.7rem; align-items: flex-start;
      cursor: pointer;
    }
    .cc-fin--fige { cursor: default; opacity: 0.75; }
    .cc-fin input { margin-top: 0.2rem; flex-shrink: 0; accent-color: var(--citron); }
    .cc-fin__txt { display: flex; flex-direction: column; gap: 0.12rem; min-width: 0; }
    .cc-fin__txt b { font-size: 0.85rem; font-weight: 600; }
    .cc-fin__txt span { font-size: 0.8rem; line-height: 1.5; color: var(--on-plum-muted); }
    .cc-fin__txt em {
      font-size: 0.76rem; font-style: normal; color: var(--citron);
      opacity: 0.85;
    }

    /* ── Les boutons ──
       Même taille, même graisse, même surface. Le seul écart est la
       couleur de l'action la plus courante, et il ne va pas jusqu'à
       rendre le refus difficile à voir. */
    .cc-actions { display: flex; gap: 0.6rem; flex-shrink: 0; flex-wrap: wrap; }
    .cc-btn {
      padding: 0.62rem 1.2rem; border-radius: var(--r-sm);
      font-size: 0.85rem; font-weight: 600; white-space: nowrap;
      background: transparent; color: #fff;
      border: 1px solid rgba(232, 239, 250, 0.24);
      transition: background 0.18s, border-color 0.18s, transform 0.18s;
    }
    .cc-btn:hover { background: rgba(232, 239, 250, 0.09); border-color: rgba(232, 239, 250, 0.4); }
    .cc-btn--fort {
      background: var(--citron); color: var(--citron-ink);
      border-color: var(--citron); font-weight: 700;
    }
    .cc-btn--fort:hover { background: var(--citron-600); border-color: var(--citron-600); transform: translateY(-1px); }

    .cc-banner :focus-visible { outline: 2px solid var(--citron); outline-offset: 2px; }

    @media (max-width: 620px) {
      .cc-actions { width: 100%; }
      .cc-actions button { flex: 1 1 auto; }
    }
  `],
})
export class CookieConsent {
  readonly consentement = inject(Consentement);
  readonly finalites = FINALITES;

  /** Le panneau détaillé, ouvert par « Choisir ». */
  readonly detaille = signal(false);

  /** L'état des cases, pré-rempli par le dernier choix connu. */
  readonly etat = signal({ ...this.consentement.dernierEtat() });

  /** Le strict nécessaire est toujours coché, et toujours désactivé. */
  coche(cle: Finalite): boolean {
    if (cle === 'necessaire') return true;
    return cle === 'mesure' ? this.etat().mesure : this.etat().confort;
  }

  basculer(cle: Finalite, evenement: Event) {
    if (cle === 'necessaire') return;
    const actif = (evenement.target as HTMLInputElement).checked;
    this.etat.update((e) => (cle === 'mesure' ? { ...e, mesure: actif } : { ...e, confort: actif }));
  }

  toutAccepter() { this.consentement.enregistrer(true, true); }

  toutRefuser() { this.consentement.enregistrer(false, false); }

  enregistrerLeChoix() {
    const e = this.etat();
    this.consentement.enregistrer(e.mesure, e.confort);
  }
}
