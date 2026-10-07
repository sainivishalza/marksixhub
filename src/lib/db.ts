import mysql, { type Pool, type RowDataPacket } from 'mysql2/promise';

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
