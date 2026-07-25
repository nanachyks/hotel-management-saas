import { Pool, types } from 'pg';
import { runMigrations } from './migrate.js';

// node-postgres returns BIGINT (e.g. COUNT(*)) as a string by default to avoid
// precision loss beyond Number.MAX_SAFE_INTEGER. This app's counts never approach
// that range, so parse them as numbers to match the app's existing numeric usage.
types.setTypeParser(20, (val: string) => parseInt(val, 10));

let pool: Pool;

function translate(sql: string): string {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  const { rows } = await pool.query(translate(sql), params);
  return rows;
}

async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

async function execute(sql: string, params: any[] = []): Promise<void> {
  await pool.query(translate(sql), params);
}

export async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set.');
  }
  pool = new Pool({ connectionString });
  await pool.query('SELECT 1');
  await runMigrations(pool);
  return pool;
}

export async function initTestDb() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (!connectionString) {
    throw new Error('TEST_DATABASE_URL is not set.');
  }
  pool = new Pool({ connectionString });
  await pool.query('SELECT 1');
  await runMigrations(pool);
  return pool;
}

export function getDb() {
  return { queryAll, queryOne, execute };
}
