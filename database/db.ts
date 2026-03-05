import * as SQLite from 'expo-sqlite';

export interface Event {
  id: number;
  title: string;
  client: string | null;
  extra_info: string | null;
  urgency: string | null;
  date: string;
  time: string | null;
  created_at: string;
}

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
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export async function getEvents(): Promise<Event[]> {
  const database = getDb();
  return database.getAllSync<Event>('SELECT * FROM events ORDER BY date ASC, time ASC');
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
    'INSERT INTO events (title, client, extra_info, urgency, date, time) VALUES (?, ?, ?, ?, ?, ?)',
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

export async function deleteEvent(id: number) {
  const database = getDb();
  database.runSync('DELETE FROM events WHERE id = ?', [id]);
}