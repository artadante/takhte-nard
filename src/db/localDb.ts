/* src/db/localDb.ts
 * Browser IndexedDB engine for Local / Offline gameplay and data persistence.
 * Stores Profiles, Matches, and Statistics locally with full async CRUD operations.
 */

import { UserProfile, MatchRecord, OnlineLobby } from './types';

const DB_NAME = 'TraditionalBackgammonDB';
const DB_VERSION = 1;

export class LocalDatabase {
  private static instance: LocalDatabase | null = null;
  private dbPromise: Promise<IDBDatabase> | null = null;

  static shared(): LocalDatabase {
    if (!this.instance) {
      this.instance = new LocalDatabase();
    }
    return this.instance;
  }

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Profiles Store
        if (!db.objectStoreNames.contains('profiles')) {
          const profileStore = db.createObjectStore('profiles', { keyPath: 'id' });
          profileStore.createIndex('username', 'username', { unique: true });
        }

        // 2. Matches Store
        if (!db.objectStoreNames.contains('matches')) {
          const matchStore = db.createObjectStore('matches', { keyPath: 'id' });
          matchStore.createIndex('startedAt', 'startedAt', { unique: false });
        }

        // 3. Lobbies Store
        if (!db.objectStoreNames.contains('lobbies')) {
          const lobbyStore = db.createObjectStore('lobbies', { keyPath: 'id' });
          lobbyStore.createIndex('status', 'status', { unique: false });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  // --- Profiles ---
  async getProfile(id: string): Promise<UserProfile | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readonly');
      const store = tx.objectStore('profiles');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async saveProfile(profile: UserProfile): Promise<UserProfile> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('profiles', 'readwrite');
      const store = tx.objectStore('profiles');
      const req = store.put(profile);
      req.onsuccess = () => resolve(profile);
      req.onerror = () => reject(req.error);
    });
  }

  // --- Matches ---
  async saveMatch(match: MatchRecord): Promise<MatchRecord> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('matches', 'readwrite');
      const store = tx.objectStore('matches');
      const req = store.put(match);
      req.onsuccess = () => resolve(match);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllMatches(limit: number = 50): Promise<MatchRecord[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('matches', 'readonly');
      const store = tx.objectStore('matches');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = (req.result || []) as MatchRecord[];
        list.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        resolve(list.slice(0, limit));
      };
      req.onerror = () => reject(req.error);
    });
  }

  // --- Lobbies ---
  async saveLobby(lobby: OnlineLobby): Promise<OnlineLobby> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('lobbies', 'readwrite');
      const store = tx.objectStore('lobbies');
      const req = store.put(lobby);
      req.onsuccess = () => resolve(lobby);
      req.onerror = () => reject(req.error);
    });
  }

  async getLobby(id: string): Promise<OnlineLobby | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('lobbies', 'readonly');
      const store = tx.objectStore('lobbies');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
}
