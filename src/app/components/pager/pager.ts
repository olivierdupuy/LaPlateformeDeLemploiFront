import { Component, computed, input, output, ChangeDetectionStrategy } from '@angular/core';

/**
 * Pagination d'une liste du panneau.
 *
 * La suite de pages reste courte quel qu'en soit le nombre : première,
 * dernière, et une fenêtre autour de la page courante. Cent boutons de
 * page ne se lisent pas, et la position se comprend mieux avec « … ».
 */
@Component({
  selector: 'app-pager',
  templateUrl: './pager.html',
  styleUrl: './pager.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pager {
  page = input.required<number>();
  pageCount = input.required<number>();
  range = input.required<{ from: number; to: number }>();
  total = input.required<number>();
  pageSize = input(25);
  /** Nom de ce qu'on compte, pour que le libellé reste concret. */
  label = input('éléments');

  pageChange = output<number>();
  pageSizeChange = output<number>();

  sizes = [25, 50, 100];

  /** null marque une coupure, rendue en « … ». */
  pages = computed<(number | null)[]>(() => {
    const current = this.page();
    const count = this.pageCount();
    if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);

    const out: (number | null)[] = [1];
    const from = Math.max(2, current - 1);
    const to = Math.min(count - 1, current + 1);
    if (from > 2) out.push(null);
    for (let p = from; p <= to; p++) out.push(p);
    if (to < count - 1) out.push(null);
    out.push(count);
    return out;
  });

  go(p: number) {
    if (p !== this.page() && p >= 1 && p <= this.pageCount()) this.pageChange.emit(p);
  }
}
