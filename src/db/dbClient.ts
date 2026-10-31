/* src/db/dbClient.ts
 * Manages Connection to PostgreSQL API Server (pgAdmin 4 / Local or Host).
 * Provides HTTP client with automatic IndexedDB offline fallback.
 */

import { DatabaseStatus } from './types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

class DbConnectionManager {
  private static instance: DbConnectionManager | null = null;
  private isServerHealthy: boolean = false;
  private lastHealthCheck: number = 0;

  private constructor() {
    this.checkHealth();
  }

  static shared(): DbConnectionManager {
    if (!this.instance) {
      this.instance = new DbConnectionManager();
    }
    return this.instance;
  }

  getApiUrl(): string {
    return API_BASE_URL;
  }

  async checkHealth(): Promise<boolean> {
    const now = Date.now();
    // Cache health result for 5 seconds
    if (now - this.lastHealthCheck < 5000 && this.isServerHealthy) {
      return this.isServerHealthy;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const res = await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal });
      clearTimeout(timeoutId);

      this.isServerHealthy = res.ok;
      this.lastHealthCheck = now;
      return this.isServerHealthy;
    } catch {
      this.isServerHealthy = false;
      this.lastHealthCheck = now;
      return false;
    }
  }

  isRemote(): boolean {
    return this.isServerHealthy;
  }

  getStatus(): DatabaseStatus {
    return {
      isConnected: true,
      isRemote: this.isServerHealthy,
      provider: this.isServerHealthy ? 'postgresql' : 'local_indexeddb',
      endpoint: this.isServerHealthy ? `${API_BASE_URL} (PostgreSQL)` : 'IndexedDB (Offline Fallback)',
      error: null,
    };
  }
}

export const dbManager = DbConnectionManager.shared();
