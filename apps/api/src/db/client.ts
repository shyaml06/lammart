import Database, { Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { config } from '../config';

let dbInstance: DatabaseType | null = null;
let currentDbPath: string | null = null;

export interface GetDbOptions {
  path?: string;
  forceNew?: boolean;
}

/**
 * Returns a configured better-sqlite3 database instance with enforced pragmas:
 * - journal_mode = WAL
 * - foreign_keys = ON
 * - busy_timeout = 5000
 * - synchronous = NORMAL
 */
export function getDb(optionsOrPath?: string | GetDbOptions): DatabaseType {
  let targetPath: string;
  let forceNew = false;

  if (typeof optionsOrPath === 'string') {
    targetPath = optionsOrPath;
  } else if (optionsOrPath && typeof optionsOrPath === 'object') {
    targetPath = optionsOrPath.path || process.env.DB_PATH || config.dbPath || path.resolve(process.cwd(), 'data/store.db');
    forceNew = Boolean(optionsOrPath.forceNew);
  } else {
    targetPath = process.env.DB_PATH || config.dbPath || path.resolve(process.cwd(), 'data/store.db');
  }

  if (dbInstance && currentDbPath === targetPath && !forceNew) {
    if (dbInstance.open) {
      return dbInstance;
    }
  }

  if (dbInstance && dbInstance.open) {
    try {
      dbInstance.close();
    } catch (_) {}
  }

  if (targetPath !== ':memory:') {
    const dbDir = path.dirname(path.resolve(targetPath));
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
  }

  const db = new Database(targetPath);

  // Enforce pragmas on every connection
  db.pragma('journal_mode = WAL;');
  db.pragma('foreign_keys = ON;');
  db.pragma('busy_timeout = 5000;');
  db.pragma('synchronous = NORMAL;');

  dbInstance = db;
  currentDbPath = targetPath;

  return db;
}

/**
 * Closes the active database connection if open.
 */
export function closeDb(): void {
  if (dbInstance) {
    if (dbInstance.open) {
      try {
        dbInstance.close();
      } catch (_) {}
    }
    dbInstance = null;
    currentDbPath = null;
  }
}
