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

  // 3. Découpage par blocs séparés d'une ligne vide
  const blocks = s.split(/\n{2,}/);
  const html = blocks.map((block) => {
    const lines = block.split('\n');

    // Liste à puces (- ou *)
    if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
      return '<ul>' + lines.map((l) => '<li>' + l.replace(/^\s*[-*]\s+/, '') + '</li>').join('') + '</ul>';
    }
    // Titres
    if (/^###\s+/.test(block)) return '<h4>' + block.replace(/^###\s+/, '') + '</h4>';
    if (/^##\s+/.test(block)) return '<h3>' + block.replace(/^##\s+/, '') + '</h3>';

    // Paragraphe (sauts de ligne simples -> <br>)
    return '<p>' + lines.join('<br>') + '</p>';
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
