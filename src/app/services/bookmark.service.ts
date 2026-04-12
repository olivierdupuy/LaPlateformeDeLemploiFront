import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'lpde_bookmarks';

@Injectable({ providedIn: 'root' })
export class BookmarkService {
  private ids = signal<number[]>(this.load());

  count = computed(() => this.ids().length);

  toggle(id: number): void {
    this.ids.update((list) =>
      list.includes(id) ? list.filter((i) => i !== id) : [...list, id]
    );
    this.save();
  }

  isBookmarked(id: number): boolean {
    return this.ids().includes(id);
  }

  getAll(): number[] {
    return this.ids();
  }

  private load(): number[] {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.ids()));
  }
}
