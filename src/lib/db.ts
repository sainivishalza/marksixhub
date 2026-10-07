import mysql, { type Pool, type ResultSetHeader, type RowDataPacket } from 'mysql2/promise';

// Reuse one pool across hot reloads in development.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const dbConfigured = Boolean(process.env.DB_NAME && process.env.DB_USER);

function pool(): Pool {
  return (globalForDb.pool ??= mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    charset: 'utf8mb4',
    dateStrings: true,
    timezone: 'Z',
  }));
}

export async function query<T extends RowDataPacket>(sql: string, params: unknown[] = []): Promise<T[]> {
  const [rows] = await pool().query<T[]>(sql, params);
  return rows;
}

/** INSERT / UPDATE / DELETE. `insertId` and `affectedRows` come back on the result. */
export async function exec(sql: string, params: unknown[] = []): Promise<ResultSetHeader> {
  const [res] = await pool().query<ResultSetHeader>(sql, params);
  return res;
}

export type Tx = {
  query<T extends RowDataPacket>(sql: string, params?: unknown[]): Promise<T[]>;
  exec(sql: string, params?: unknown[]): Promise<ResultSetHeader>;
};

export async function tx<T>(fn: (t: Tx) => Promise<T>): Promise<T> {
  const conn = await pool().getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn({
      query: async <R extends RowDataPacket>(sql: string, params: unknown[] = []) => (await conn.query<R[]>(sql, params))[0],
      exec: async (sql, params = []) => (await conn.query<ResultSetHeader>(sql, params))[0],
    });
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
