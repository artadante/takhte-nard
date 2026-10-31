/* server/db.ts
 * PostgreSQL connection pool and automatic table initialization for Traditional Backgammon.
 * Connects directly to local PostgreSQL (pgAdmin 4) or remote PostgreSQL server.
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

export const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: Number(process.env.PG_PORT) || 5432,
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
  database: process.env.PG_DATABASE || 'postgres',
  connectionTimeoutMillis: 5000,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    // 1. Profiles Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.profiles (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL DEFAULT 'بازیکن تخته نرد',
        avatar_url TEXT DEFAULT './assets/images/marble_white.png',
        coins INTEGER NOT NULL DEFAULT 1000 CHECK (coins >= 0),
        rating INTEGER NOT NULL DEFAULT 1200,
        wins INTEGER NOT NULL DEFAULT 0 CHECK (wins >= 0),
        losses INTEGER NOT NULL DEFAULT 0 CHECK (losses >= 0),
        mars_wins INTEGER NOT NULL DEFAULT 0 CHECK (mars_wins >= 0),
        home_mars_wins INTEGER NOT NULL DEFAULT 0 CHECK (home_mars_wins >= 0),
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
      );
      CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating DESC);
    `);

    // 2. Matches Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.matches (
        id TEXT PRIMARY KEY,
        white_player_id TEXT NOT NULL,
        white_player_name TEXT NOT NULL,
        black_player_id TEXT NOT NULL,
        black_player_name TEXT NOT NULL,
        winner_id TEXT,
        winner_color TEXT,
        victory_type TEXT,
        points_earned INTEGER DEFAULT 1,
        is_online BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'finished',
        moves_count INTEGER DEFAULT 0,
        started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        finished_at TIMESTAMPTZ
      );
      CREATE INDEX IF NOT EXISTS idx_matches_started_at ON public.matches(started_at DESC);
    `);

    // 3. Online Lobbies Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.lobbies (
        id TEXT PRIMARY KEY,
        room_code VARCHAR(6) UNIQUE NOT NULL,
        host_player_id TEXT NOT NULL,
        host_player_name TEXT NOT NULL,
        guest_player_id TEXT,
        guest_player_name TEXT,
        status TEXT NOT NULL DEFAULT 'waiting',
        bet_amount INTEGER NOT NULL DEFAULT 100,
        board_side TEXT NOT NULL DEFAULT 'right',
        created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
      );
      CREATE INDEX IF NOT EXISTS idx_lobbies_status ON public.lobbies(status);
    `);

    console.log('✅ PostgreSQL database tables initialized successfully (visible in pgAdmin 4).');
  } catch (err) {
    console.error('❌ Database initialization error:', err);
  } finally {
    client.release();
  }
}
