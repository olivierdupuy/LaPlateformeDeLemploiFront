import { Pipe, PipeTransform, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

/**
 * Rendu markdown minimal et **sécurisé** : le texte est d'abord entièrement échappé
 * (aucune balise HTML de l'utilisateur ne survit), puis une syntaxe markdown restreinte
 * est convertie en balises contrôlées. bypassSecurityTrustHtml est donc sûr ici.
 */
export function renderMarkdown(src: string): string {
  if (!src) return '';
  // 1. Échappement complet du HTML entrant
  let s = src
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // 2. Inline : gras, italique, liens (URL http(s) uniquement)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
  s = s.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // 3. Découpage par blocs séparés d'une ligne vide, puis lecture ligne à ligne.
  // Un titre suivi immédiatement de ses puces est le cas le plus courant : le
  // traiter au niveau du bloc entier avalerait la liste dans le titre.
  const blocks = s.split(/\n{2,}/);
  const html = blocks.map((block) => {
    let out = '';
    let items: string[] = [];
    let para: string[] = [];

    const flushList = () => {
      if (!items.length) return;
      out += '<ul>' + items.map((i) => '<li>' + i + '</li>').join('') + '</ul>';
      items = [];
    };
    const flushPara = () => {
      if (!para.length) return;
      out += '<p>' + para.join('<br>') + '</p>';
      para = [];
    };

    for (const line of block.split('\n')) {
      if (/^\s*[-*]\s+/.test(line)) {
        flushPara();
        items.push(line.replace(/^\s*[-*]\s+/, ''));
      } else if (/^###\s+/.test(line)) {
        flushList(); flushPara();
        out += '<h4>' + line.replace(/^###\s+/, '') + '</h4>';
      } else if (/^##\s+/.test(line)) {
        flushList(); flushPara();
        out += '<h3>' + line.replace(/^##\s+/, '') + '</h3>';
      } else if (line.trim()) {
        flushList();
        para.push(line);
      }
    }
    flushList();
    flushPara();
    return out;
  }).join('');

  return html;
}

@Pipe({ name: 'markdown', standalone: true })
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  transform(value: string | undefined | null): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(renderMarkdown(value || ''));
  }
}
