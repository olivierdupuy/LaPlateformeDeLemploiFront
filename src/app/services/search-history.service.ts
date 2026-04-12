import { Injectable, signal } from '@angular/core';

const KEY = 'lpde_recent_searches';
const MAX = 8;

@Injectable({ providedIn: 'root' })
export class SearchHistoryService {
  recent = signal<string[]>(this.load());

  add(query: string): void {
    const q = query.trim();
    if (!q) return;
    this.recent.update((list) => {
      const filtered = list.filter((s) => s.toLowerCase() !== q.toLowerCase());
      return [q, ...filtered].slice(0, MAX);
    });
    this.save();
  }

  clear(): void {
    this.recent.set([]);
    localStorage.removeItem(KEY);
  }

  private load(): string[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  }

  private save(): void {
    localStorage.setItem(KEY, JSON.stringify(this.recent()));
  }
}
