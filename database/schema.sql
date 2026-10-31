-- database/schema.sql
-- Production PostgreSQL / Supabase Schema for Traditional Backgammon (تخته نرد سنتی)
-- Ready for Cloud Host (Supabase, Railway, Neon, AWS RDS, Docker VPS)

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES TABLE (User profiles, coins, ratings, stats)
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

-- Index for leaderboard / rating lookups
CREATE INDEX IF NOT EXISTS idx_profiles_rating ON public.profiles(rating DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_coins ON public.profiles(coins DESC);

-- 2. MATCHES TABLE (Match history, turns, scores, victor)
CREATE TABLE IF NOT EXISTS public.matches (
  id TEXT PRIMARY KEY,
  white_player_id TEXT NOT NULL,
  white_player_name TEXT NOT NULL,
  black_player_id TEXT NOT NULL,
  black_player_name TEXT NOT NULL,
  winner_id TEXT,
  winner_color TEXT CHECK (winner_color IN ('white', 'black')),
  victory_type TEXT CHECK (victory_type IN ('oin', 'mars', 'home_mars')),
  points_earned INTEGER DEFAULT 1,
  is_online BOOLEAN NOT NULL DEFAULT false,
  status TEXT NOT NULL DEFAULT 'finished' CHECK (status IN ('pending', 'in_progress', 'finished', 'abandoned')),
  moves_count INTEGER DEFAULT 0,
  board_state_snapshot JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_matches_started_at ON public.matches(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_matches_winner_id ON public.matches(winner_id);

-- 3. ONLINE LOBBIES TABLE (Real-time matchmaking and rooms)
CREATE TABLE IF NOT EXISTS public.lobbies (
  id TEXT PRIMARY KEY,
  room_code VARCHAR(6) UNIQUE NOT NULL,
  host_player_id TEXT NOT NULL,
  host_player_name TEXT NOT NULL,
  guest_player_id TEXT,
  guest_player_name TEXT,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'in_progress', 'completed', 'cancelled')),
  bet_amount INTEGER NOT NULL DEFAULT 100,
  board_side TEXT NOT NULL DEFAULT 'right' CHECK (board_side IN ('right', 'left')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_lobbies_status ON public.lobbies(status);
CREATE INDEX IF NOT EXISTS idx_lobbies_room_code ON public.lobbies(room_code);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lobbies ENABLE ROW LEVEL SECURITY;

-- Allow public read/write access for game client (can be tightened with Auth)
CREATE POLICY "Public profiles are readable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Public profiles can be upserted" ON public.profiles FOR ALL USING (true);

CREATE POLICY "Matches are readable by everyone" ON public.matches FOR SELECT USING (true);
CREATE POLICY "Matches can be inserted by players" ON public.matches FOR INSERT WITH CHECK (true);

CREATE POLICY "Lobbies are readable by everyone" ON public.lobbies FOR SELECT USING (true);
CREATE POLICY "Lobbies can be managed by players" ON public.lobbies FOR ALL USING (true);

-- Enable Realtime for multiplayer sync (if on Supabase)
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.lobbies;
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.matches;
