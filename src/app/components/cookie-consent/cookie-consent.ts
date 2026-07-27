import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="cc-banner" role="dialog" aria-labelledby="cc-title">
        <div class="cc-inner">
          <div class="cc-text">
            <strong id="cc-title">Cookies</strong>
            <p>
              Les cookies essentiels font fonctionner le site. Les autres nous servent à mesurer
              l'audience. Vous choisissez, et vous pourrez changer d'avis quand vous voulez.
            </p>
          </div>
          <div class="cc-actions">
            <button class="cc-refuse" (click)="choose('refused')">Essentiels seulement</button>
            <button class="cc-accept" (click)="choose('accepted')">Tout accepter</button>
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
    }
    @keyframes ccup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

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

    .cc-actions { display: flex; gap: 0.6rem; flex-shrink: 0; }
    .cc-refuse, .cc-accept {
      padding: 0.62rem 1.2rem; border-radius: var(--r-sm);
      font-size: 0.85rem; font-weight: 600; white-space: nowrap;
      transition: background 0.18s, border-color 0.18s, transform 0.18s;
    }
    .cc-refuse {
      background: transparent; color: #fff;
      border: 1px solid rgba(232, 239, 250, 0.24);
    }
    .cc-refuse:hover { background: rgba(232, 239, 250, 0.09); border-color: rgba(232, 239, 250, 0.4); }
    .cc-accept { background: var(--citron); color: var(--citron-ink); font-weight: 700; }
    .cc-accept:hover { background: var(--citron-600); transform: translateY(-1px); }

    .cc-banner :focus-visible { outline: 2px solid var(--citron); outline-offset: 2px; }

    @media (max-width: 620px) {
      .cc-actions { width: 100%; }
      .cc-actions button { flex: 1; }
    }
  `],
})
export class CookieConsent {
  visible = signal(this.readConsent() === null);

  private readConsent(): string | null {
    try { return localStorage.getItem('cookie_consent'); } catch { return null; }
  }
  choose(value: 'accepted' | 'refused') {
    try { localStorage.setItem('cookie_consent', value); } catch {}
    this.visible.set(false);
  }
}
