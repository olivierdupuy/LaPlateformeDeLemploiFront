import { Injectable, signal } from '@angular/core';

type Lang = 'fr' | 'en';

const DICT: Record<Lang, Record<string, string>> = {
  fr: {
    'nav.home': 'Accueil',
    'nav.offers': 'Offres',
    'nav.browse': 'Parcourir',
    'nav.companies': 'Entreprises',
    'nav.salaries': 'Salaires',
    'nav.publish': 'Publier',
    'nav.login': 'Connexion',
    'nav.register': 'Inscription',
    'nav.guide': 'Guide Carrières',
  },
  en: {
    'nav.home': 'Home',
    'nav.offers': 'Jobs',
    'nav.browse': 'Browse',
    'nav.companies': 'Companies',
    'nav.salaries': 'Salaries',
    'nav.publish': 'Post a job',
    'nav.login': 'Sign in',
    'nav.register': 'Sign up',
    'nav.guide': 'Career Guide',
  },
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private read(): Lang {
    try { const l = localStorage.getItem('lang'); return l === 'en' ? 'en' : 'fr'; } catch { return 'fr'; }
  }
  lang = signal<Lang>(this.read());

  /** Traduit une clé ; retourne la clé si absente (fallback). */
  t(key: string): string {
    return DICT[this.lang()][key] ?? DICT.fr[key] ?? key;
  }

  setLang(l: Lang) {
    this.lang.set(l);
    try { localStorage.setItem('lang', l); } catch {}
    try { document.documentElement.lang = l; } catch {}
  }
  toggle() { this.setLang(this.lang() === 'fr' ? 'en' : 'fr'); }
}
