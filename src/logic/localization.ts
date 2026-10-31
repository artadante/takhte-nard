/* localization.ts
 * Multi-language manager supporting English, Persian, Russian, Turkish, etc.
 */

import { SettingsStore } from './settingsStore';

export interface TranslationDictionary {
  [key: string]: string;
}

export class Localization {
  private static currentLang: string = 'fa';
  private static translations: TranslationDictionary = {};
  private static cache: Map<string, TranslationDictionary> = new Map();
  private static listeners: Set<() => void> = new Set();

  static async init(lang?: string): Promise<void> {
    const initialLang = lang || SettingsStore.shared().get().language || 'fa';
    await this.setLanguage(initialLang);
  }

  static async setLanguage(lang: string): Promise<void> {
    this.currentLang = lang;
    if (this.cache.has(lang)) {
      this.translations = this.cache.get(lang)!;
      this.notify();
      return;
    }

    try {
      const res = await fetch(`./assets/translations/${lang}.json`);
      if (res.ok) {
        const data = await res.json();
        this.cache.set(lang, data);
        this.translations = data;
        this.notify();
        return;
      }
    } catch {
      // Fetch failed, try fallback
    }

    // Try fallback to en if not found
    if (lang !== 'en') {
      try {
        const res = await fetch(`./assets/translations/en.json`);
        if (res.ok) {
          const data = await res.json();
          this.cache.set('en', data);
          this.translations = data;
          this.notify();
          return;
        }
      } catch {
        // Fallback
      }
    }

    this.notify();
  }

  static t(key: string, params?: Record<string, string | number>): string {
    let str = this.translations[key] || key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  }

  static subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private static notify(): void {
    this.listeners.forEach(fn => fn());
  }

  static getLanguage(): string {
    return this.currentLang;
  }
}
