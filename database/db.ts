// database/db.ts

import * as SQLite from 'expo-sqlite';

export interface Event {
  id: number;
  title: string;
  client: string | null;
  extra_info: string | null;
  urgency: string | null;
  date: string;
  time: string | null;
  completed: number;
  notification_id: string | null;
  created_at: string;
}

export type SortOption = 'date_asc' | 'date_desc' | 'urgency_desc';

let db: SQLite.SQLiteDatabase | null = null;

function getDb(): SQLite.SQLiteDatabase {
  if (!db) {
    db = SQLite.openDatabaseSync('mrp_agenda.db');
  }
  return db;
}

export function initDatabase() {
  const database = getDb();

  database.execSync(`
    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      client TEXT,
      extra_info TEXT,
      urgency TEXT,
      date TEXT NOT NULL,
      time TEXT,
      completed INTEGER DEFAULT 0,
      notification_id TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Migraciones para bases de datos existentes
  const migrations = [
    `ALTER TABLE events ADD COLUMN completed INTEGER DEFAULT 0;`,
    `ALTER TABLE events ADD COLUMN notification_id TEXT;`,
  ];
  for (const sql of migrations) {
    try { database.execSync(sql); } catch { /* columna ya existe */ }
  }
}

// ─── Settings ────────────────────────────────────────────────────────────────

export function getPreference(key: string, defaultValue: string): string {
  const database = getDb();
  const row = database.getFirstSync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?', [key]
  );
  return row?.value ?? defaultValue;
}

export function setPreference(key: string, value: string): void {
  const database = getDb();
  database.runSync(
    'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
    [key, value]
  );
}

// ─── Events ──────────────────────────────────────────────────────────────────

export async function getEvents(sort: SortOption = 'date_asc'): Promise<Event[]> {
  const database = getDb();
  const orderClause = {
    date_asc: 'date ASC, time ASC',
    date_desc: 'date DESC, time DESC',
    urgency_desc: `CASE urgency WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END ASC, date ASC`,
  }[sort];
  return database.getAllSync<Event>(`SELECT * FROM events ORDER BY ${orderClause}`);
}

export async function getEventById(id: number): Promise<Event | null> {
  const database = getDb();
  return database.getFirstSync<Event>('SELECT * FROM events WHERE id = ?', [id]) ?? null;
}

export async function createEvent(event: {
  title: string;
  client?: string;
  extra_info?: string;
  urgency?: string | null;
  date: string;
  time?: string;
}): Promise<number | null> {
  const database = getDb();
  const result = database.runSync(
    'INSERT INTO events (title, client, extra_info, urgency, date, time, completed) VALUES (?, ?, ?, ?, ?, ?, 0)',
    [
      event.title,
      event.client ?? null,
      event.extra_info ?? null,
      event.urgency ?? null,
      event.date,
      event.time ?? null,
    ]
  );
  return result.lastInsertRowId ?? null;
}

export async function updateEvent(
  id: number,
  event: {
    title?: string;
    client?: string;
    extra_info?: string;
    urgency?: string | null;
    time?: string;
  }
) {
  const database = getDb();
  database.runSync(
    'UPDATE events SET title = ?, client = ?, extra_info = ?, urgency = ?, time = ? WHERE id = ?',
    [
      event.title ?? '',
      event.client ?? null,
      event.extra_info ?? null,
      event.urgency ?? null,
      event.time ?? null,
      id,
    ]
  );
}

export async function saveNotificationId(id: number, notificationId: string | null) {
  const database = getDb();
  database.runSync(
    'UPDATE events SET notification_id = ? WHERE id = ?',
    [notificationId, id]
  );
}

export async function toggleEventCompleted(id: number, completed: boolean) {
  const database = getDb();
  database.runSync(
    'UPDATE events SET completed = ? WHERE id = ?',
    [completed ? 1 : 0, id]
  );
}

export async function deleteEvent(id: number) {
  const database = getDb();
  database.runSync('DELETE FROM events WHERE id = ?', [id]);
}