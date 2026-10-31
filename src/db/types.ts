/* src/db/types.ts
 * Database models and type definitions for Traditional Backgammon.
 * Supports Profiles, Match History, Online Lobbies, and Stats.
 */

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  coins: number;
  rating: number; // ELO rating (e.g. 1200 initial)
  wins: number;
  losses: number;
  marsWins: number;
  homeMarsWins: number;
  totalGames: number;
  isOnline?: boolean;
  lastSeen?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MatchRecord {
  id: string;
  whitePlayerId: string;
  whitePlayerName: string;
  blackPlayerId: string;
  blackPlayerName: string;
  winnerColor: 'white' | 'black' | null;
  winnerId: string | null;
  victoryType: 'oin' | 'mars' | 'home_mars' | null;
  pointsEarned: number;
  isOnline: boolean;
  status: 'pending' | 'in_progress' | 'finished' | 'abandoned';
  movesCount: number;
  boardStateSnapshot?: string; // Serialized final board state
  startedAt: string;
  finishedAt: string | null;
}

export interface OnlineLobby {
  id: string;
  roomCode: string;
  hostPlayerId: string;
  hostPlayerName: string;
  guestPlayerId: string | null;
  guestPlayerName: string | null;
  status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  betAmount: number;
  boardSide: 'right' | 'left';
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseStatus {
  isConnected: boolean;
  isRemote: boolean;
  provider: 'postgresql' | 'local_indexeddb';
  endpoint: string;
  error: string | null;
}
