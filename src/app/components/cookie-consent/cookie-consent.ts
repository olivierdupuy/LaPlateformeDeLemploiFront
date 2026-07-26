import { Component, signal } from '@angular/core';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  template: `
    @if (visible()) {
      <div class="cc-banner" role="dialog" aria-label="Consentement cookies">
        <div class="cc-inner">
          <div class="cc-text">
            <strong>🍪 Cookies</strong>
            <p>Nous utilisons des cookies pour améliorer votre expérience et analyser le trafic. Vous pouvez accepter ou refuser les cookies non essentiels.</p>
          </div>
          <div class="cc-actions">
            <button class="cc-refuse" (click)="choose('refused')">Refuser</button>
            <button class="cc-accept" (click)="choose('accepted')">Tout accepter</button>
          </div>
        </div>
      </div>
    }
  `,
  styles: [`
    .cc-banner {
      position: fixed; left: 1rem; right: 1rem; bottom: 1rem; z-index: 900;
      background: var(--ink); color: #fff; border-radius: var(--r-lg);
      box-shadow: var(--shadow-xl); animation: ccup 0.35s cubic-bezier(0.16,1,0.3,1) both;
      max-width: 1100px; margin: 0 auto;
    }
    @keyframes ccup { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    .cc-inner { display: flex; align-items: center; gap: 1.5rem; padding: 1.1rem 1.4rem; flex-wrap: wrap; }
    .cc-text { flex: 1; min-width: 260px; }
    .cc-text strong { font-family: var(--font-display); font-size: 0.95rem; }
    .cc-text p { font-size: 0.84rem; color: rgba(255,255,255,0.7); line-height: 1.5; margin-top: 0.2rem; }
    .cc-actions { display: flex; gap: 0.6rem; flex-shrink: 0; }
    .cc-refuse, .cc-accept { padding: 0.6rem 1.2rem; border-radius: var(--r-sm); font-size: 0.85rem; font-weight: 600; }
    .cc-refuse { background: rgba(255,255,255,0.1); color: #fff; border: 1px solid rgba(255,255,255,0.2);
      &:hover { background: rgba(255,255,255,0.18); } }
    .cc-accept { background: var(--spring); color: var(--ink);
      &:hover { background: var(--spring-600); } }
    @media (max-width: 560px) { .cc-actions { width: 100%; button { flex: 1; } } }
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
