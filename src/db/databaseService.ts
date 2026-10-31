/* src/db/databaseService.ts
 * Unified Database Service for Traditional Backgammon.
 * Connects directly to PostgreSQL (accessible via pgAdmin 4) with seamless local fallback.
 */

import { dbManager } from './dbClient';
import { LocalDatabase } from './localDb';
import { UserProfile, MatchRecord, OnlineLobby, DatabaseStatus } from './types';

const LOCAL_USER_ID_KEY = 'backgammon_current_user_id';

export class DatabaseService {
  private static instance: DatabaseService | null = null;
  private localDb: LocalDatabase;
  private currentUserId: string;

  private constructor() {
    this.localDb = LocalDatabase.shared();
    this.currentUserId = this.initCurrentUserId();
  }

  static shared(): DatabaseService {
    if (!this.instance) {
      this.instance = new DatabaseService();
    }
    return this.instance;
  }

  private initCurrentUserId(): string {
    if (typeof window === 'undefined') return 'guest_default';
    let id = localStorage.getItem(LOCAL_USER_ID_KEY);
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 9);
      localStorage.setItem(LOCAL_USER_ID_KEY, id);
    }
    return id;
  }

  getCurrentUserId(): string {
    return this.currentUserId;
  }

  getStatus(): DatabaseStatus {
    return dbManager.getStatus();
  }

  // ==========================================
  // 1. USER PROFILE MANAGEMENT
  // ==========================================

  async getProfile(userId: string = this.currentUserId): Promise<UserProfile> {
    const isHealthy = await dbManager.checkHealth();

    // 1. Try PostgreSQL server if online
    if (isHealthy) {
      try {
        const res = await fetch(`${dbManager.getApiUrl()}/api/profiles/${userId}`);
        if (res.ok) {
          const data = await res.json();
          await this.localDb.saveProfile(data); // cache locally
          return data;
        }
      } catch (err) {
        console.warn('PostgreSQL profile fetch failed, using local fallback:', err);
      }
    }

    // 2. Fallback to Local IndexedDB
    let localProfile = await this.localDb.getProfile(userId);
    if (!localProfile) {
      const now = new Date().toISOString();
      localProfile = {
        id: userId,
        username: 'player_' + userId.slice(-4),
        displayName: 'بازیکن تخته نرد',
        avatarUrl: './assets/images/marble_white.png',
        coins: 1000,
        rating: 1200,
        wins: 0,
        losses: 0,
        marsWins: 0,
        homeMarsWins: 0,
        totalGames: 0,
        isOnline: false,
        createdAt: now,
        updatedAt: now,
      };
      await this.localDb.saveProfile(localProfile);

      // Try saving to PostgreSQL in background
      if (isHealthy) {
        fetch(`${dbManager.getApiUrl()}/api/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(localProfile),
        }).catch(() => {});
      }
    }

    return localProfile;
  }

  async updateProfile(updates: Partial<UserProfile>, userId: string = this.currentUserId): Promise<UserProfile> {
    const current = await this.getProfile(userId);
    const updated: UserProfile = {
      ...current,
      ...updates,
      id: userId,
      updatedAt: new Date().toISOString(),
    };

    // Save locally
    await this.localDb.saveProfile(updated);

    // Save to PostgreSQL if server is running
    const isHealthy = await dbManager.checkHealth();
    if (isHealthy) {
      try {
        await fetch(`${dbManager.getApiUrl()}/api/profiles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updated),
        });
      } catch (err) {
        console.warn('PostgreSQL profile update failed:', err);
      }
    }

    return updated;
  }

  async addCoins(amount: number, userId: string = this.currentUserId): Promise<number> {
    const profile = await this.getProfile(userId);
    const newCoins = Math.max(0, profile.coins + amount);
    await this.updateProfile({ coins: newCoins }, userId);
    return newCoins;
  }

  // ==========================================
  // 2. MATCH HISTORY & RESULTS
  // ==========================================

  async recordMatch(
    matchData: Omit<MatchRecord, 'id' | 'startedAt'>
  ): Promise<MatchRecord> {
    const id = 'match_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const startedAt = new Date().toISOString();

    const record: MatchRecord = {
      id,
      startedAt,
      ...matchData,
      finishedAt: matchData.finishedAt || new Date().toISOString(),
    };

    // 1. Save locally
    await this.localDb.saveMatch(record);

    // 2. Update player stats
    if (record.winnerId) {
      const isWinner = record.winnerId === this.currentUserId;
      const profile = await this.getProfile(this.currentUserId);
      const isHomeMars = record.victoryType === 'home_mars';
      const isMars = record.victoryType === 'mars';

      const updatedStats = {
        wins: isWinner ? profile.wins + 1 : profile.wins,
        losses: !isWinner ? profile.losses + 1 : profile.losses,
        marsWins: isWinner && isMars ? profile.marsWins + 1 : profile.marsWins,
        homeMarsWins: isWinner && isHomeMars ? profile.homeMarsWins + 1 : profile.homeMarsWins,
        coins: isWinner ? profile.coins + 100 : Math.max(0, profile.coins - 50),
        rating: isWinner ? profile.rating + 16 : Math.max(100, profile.rating - 16),
      };

      await this.updateProfile(updatedStats, this.currentUserId);
    }

    // 3. Save to PostgreSQL if server is running
    const isHealthy = await dbManager.checkHealth();
    if (isHealthy) {
      try {
        await fetch(`${dbManager.getApiUrl()}/api/matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      } catch (err) {
        console.warn('PostgreSQL match insert failed:', err);
      }
    }

    return record;
  }

  async getMatchHistory(limit: number = 30): Promise<MatchRecord[]> {
    const isHealthy = await dbManager.checkHealth();

    if (isHealthy) {
      try {
        const res = await fetch(`${dbManager.getApiUrl()}/api/matches?limit=${limit}`);
        if (res.ok) {
          const rows = await res.json();
          return rows.map((m: Record<string, unknown>) => ({
            id: m.id,
            whitePlayerId: m.white_player_id || m.whitePlayerId,
            whitePlayerName: m.white_player_name || m.whitePlayerName,
            blackPlayerId: m.black_player_id || m.blackPlayerId,
            blackPlayerName: m.black_player_name || m.blackPlayerName,
            winnerId: m.winner_id || m.winnerId,
            winnerColor: m.winner_color || m.winnerColor,
            victoryType: m.victory_type || m.victoryType,
            pointsEarned: m.points_earned || m.pointsEarned || 1,
            isOnline: Boolean(m.is_online ?? m.isOnline),
            status: m.status,
            movesCount: m.moves_count || m.movesCount || 0,
            startedAt: m.started_at || m.startedAt,
            finishedAt: m.finished_at || m.finishedAt,
          }));
        }
      } catch {
        // Fallback to local
      }
    }

    return this.localDb.getAllMatches(limit);
  }

  // ==========================================
  // 3. ONLINE LOBBIES / MATCHMAKING
  // ==========================================

  async createLobby(betAmount: number = 100, boardSide: 'right' | 'left' = 'right'): Promise<OnlineLobby> {
    const profile = await this.getProfile();
    const id = 'lobby_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const roomCode = Math.floor(100000 + Math.random() * 900000).toString();
    const now = new Date().toISOString();

    const lobby: OnlineLobby = {
      id,
      roomCode,
      hostPlayerId: profile.id,
      hostPlayerName: profile.displayName || profile.username,
      guestPlayerId: null,
      guestPlayerName: null,
      status: 'waiting',
      betAmount,
      boardSide,
      createdAt: now,
      updatedAt: now,
    };

    await this.localDb.saveLobby(lobby);

    const isHealthy = await dbManager.checkHealth();
    if (isHealthy) {
      try {
        await fetch(`${dbManager.getApiUrl()}/api/lobbies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(lobby),
        });
      } catch (err) {
        console.warn('PostgreSQL lobby insert failed:', err);
      }
    }

    return lobby;
  }
}

export const dbService = DatabaseService.shared();
