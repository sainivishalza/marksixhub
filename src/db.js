const mysql = require('mysql2/promise');
const { db } = require('./config');

const pool = mysql.createPool({
  ...db,
  waitForConnections: true,
  connectionLimit: 5,
  charset: 'utf8mb4',
  dateStrings: true,
  timezone: 'Z',
});

const q = async (sql, params) => (await pool.query(sql, params))[0];
const one = async (sql, params) => (await q(sql, params))[0] || null;

async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn((sql, params) => conn.query(sql, params).then((r) => r[0]));
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

const store = new Map();
async function cached(key, ttlMs, load) {
  const hit = store.get(key);
  if (hit && hit.exp > Date.now()) return hit.val;
  const val = await load();
  store.set(key, { val, exp: Date.now() + ttlMs });
  return val;
}
const bust = (...keys) => keys.forEach((k) => store.delete(k));

module.exports = { q, one, tx, cached, bust };
