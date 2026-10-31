/* server/index.ts
 * Express API Server for Traditional Backgammon.
 * Powers PostgreSQL database interactions for local play (pgAdmin 4) and server hosting.
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { pool, initDb } from './db';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 1. Health check & DB connection test
app.get('/api/health', async (_req, res) => {
  try {
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'ok',
      db: 'connected',
      timestamp: result.rows[0].now,
      provider: 'PostgreSQL (pgAdmin 4 / Local or Host)',
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      db: 'disconnected',
      message: (err as Error).message,
    });
  }
});

// 2. Get User Profile
app.get('/api/profiles/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM public.profiles WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      coins: row.coins,
      rating: row.rating,
      wins: row.wins,
      losses: row.losses,
      marsWins: row.mars_wins,
      homeMarsWins: row.home_mars_wins,
      totalGames: row.wins + row.losses,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 3. Upsert User Profile
app.post('/api/profiles', async (req, res) => {
  try {
    const {
      id,
      username,
      displayName,
      avatarUrl,
      coins,
      rating,
      wins,
      losses,
      marsWins,
      homeMarsWins,
    } = req.body;

    const query = `
      INSERT INTO public.profiles (
        id, username, display_name, avatar_url, coins, rating, wins, losses, mars_wins, home_mars_wins, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        display_name = EXCLUDED.display_name,
        avatar_url = EXCLUDED.avatar_url,
        coins = EXCLUDED.coins,
        rating = EXCLUDED.rating,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        mars_wins = EXCLUDED.mars_wins,
        home_mars_wins = EXCLUDED.home_mars_wins,
        updated_at = NOW()
      RETURNING *;
    `;

    const values = [
      id,
      username || 'player_' + id.slice(-4),
      displayName || 'بازیکن تخته نرد',
      avatarUrl || './assets/images/marble_white.png',
      coins ?? 1000,
      rating ?? 1200,
      wins ?? 0,
      losses ?? 0,
      marsWins ?? 0,
      homeMarsWins ?? 0,
    ];

    const result = await pool.query(query, values);
    const row = result.rows[0];
    res.json({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      coins: row.coins,
      rating: row.rating,
      wins: row.wins,
      losses: row.losses,
      marsWins: row.mars_wins,
      homeMarsWins: row.home_mars_wins,
      totalGames: row.wins + row.losses,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 4. Save Match Record
app.post('/api/matches', async (req, res) => {
  try {
    const {
      id,
      whitePlayerId,
      whitePlayerName,
      blackPlayerId,
      blackPlayerName,
      winnerId,
      winnerColor,
      victoryType,
      pointsEarned,
      isOnline,
      status,
      movesCount,
      startedAt,
      finishedAt,
    } = req.body;

    const query = `
      INSERT INTO public.matches (
        id, white_player_id, white_player_name, black_player_id, black_player_name,
        winner_id, winner_color, victory_type, points_earned, is_online, status,
        moves_count, started_at, finished_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const values = [
      id,
      whitePlayerId,
      whitePlayerName,
      blackPlayerId,
      blackPlayerName,
      winnerId,
      winnerColor,
      victoryType,
      pointsEarned ?? 1,
      Boolean(isOnline),
      status || 'finished',
      movesCount ?? 0,
      startedAt || new Date().toISOString(),
      finishedAt || new Date().toISOString(),
    ];

    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 5. Get Match History
app.get('/api/matches', async (req, res) => {
  try {
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 30));
    const result = await pool.query(
      'SELECT * FROM public.matches ORDER BY started_at DESC LIMIT $1',
      [limit]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// 6. Online Lobbies
app.get('/api/lobbies', async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM public.lobbies WHERE status = 'waiting' ORDER BY created_at DESC LIMIT 20"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

app.post('/api/lobbies', async (req, res) => {
  try {
    const { id, roomCode, hostPlayerId, hostPlayerName, betAmount, boardSide } = req.body;
    const query = `
      INSERT INTO public.lobbies (
        id, room_code, host_player_id, host_player_name, bet_amount, board_side, status, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'waiting', NOW(), NOW())
      RETURNING *;
    `;
    const result = await pool.query(query, [
      id,
      roomCode,
      hostPlayerId,
      hostPlayerName,
      betAmount || 100,
      boardSide || 'right',
    ]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Traditional Backgammon PostgreSQL API Server running on http://localhost:${PORT}`);
  try {
    await initDb();
  } catch {
    console.warn('⚠️ Could not connect to PostgreSQL. Please check credentials in .env');
  }
});
