import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { exec, query } from './db';
import { FAQS } from './faq';
import { hashPassword } from './password';
import { makeOrderNo } from './receipt';

// Same tables as the legacy Express app, so existing data and accounts carry over. Everything here is additive and safe to re-run.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    pass_hash VARCHAR(255) NOT NULL,
    role ENUM('user','viewer','support','editor','admin') NOT NULL DEFAULT 'user',
    currency CHAR(3) NOT NULL DEFAULT 'HKD',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at DATETIME NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS currencies (
    code CHAR(3) PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    symbol VARCHAR(6) NOT NULL DEFAULT '',
    rate DECIMAL(18,6) NOT NULL,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS draws (
    id INT AUTO_INCREMENT PRIMARY KEY,
    draw_no VARCHAR(8) NOT NULL UNIQUE,
    draw_date DATE NOT NULL,
    status ENUM('upcoming','published') NOT NULL DEFAULT 'upcoming',
    nums VARCHAR(20) NULL,
    extra TINYINT NULL,
    est_jackpot_hkd BIGINT NOT NULL DEFAULT 0,
    note VARCHAR(255) NULL,
    KEY idx_status_date (status, draw_date)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS draw_prizes (
    draw_id INT NOT NULL,
    division TINYINT NOT NULL,
    winners INT NOT NULL DEFAULT 0,
    prize_hkd BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (draw_id, division),
    FOREIGN KEY (draw_id) REFERENCES draws(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS events (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(120) NOT NULL,
    event_date DATE NOT NULL,
    body VARCHAR(500) NOT NULL DEFAULT '',
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS saved_sets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nums VARCHAR(20) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id),
    KEY idx_created (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS point_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    delta INT NOT NULL,
    reason VARCHAR(80) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    draw_no VARCHAR(8) NOT NULL,
    tickets INT NOT NULL,
    points INT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_draw (draw_no),
    KEY idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    action VARCHAR(40) NOT NULL,
    detail VARCHAR(250) NOT NULL DEFAULT '',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS favourites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    nums VARCHAR(40) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS login_fails (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL,
    ip VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    KEY idx_email_time (email, created_at)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS password_resets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS email_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used TINYINT(1) NOT NULL DEFAULT 0,
    KEY idx_user (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS settings (
    k VARCHAR(40) PRIMARY KEY,
    v TEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(200) NOT NULL,
    answer TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    active TINYINT(1) NOT NULL DEFAULT 1
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS page_seo (
    path VARCHAR(80) PRIMARY KEY,
    title VARCHAR(120) NOT NULL DEFAULT '',
    description VARCHAR(300) NOT NULL DEFAULT ''
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Indicative rates per 1 HKD. The admin keeps these current.
const CURRENCIES: [string, string, string, number][] = [
  ['HKD', 'Hong Kong Dollar', 'HK$', 1],
  ['INR', 'Indian Rupee', '₹', 11.4],
  ['CAD', 'Canadian Dollar', 'C$', 0.18],
  ['ZAR', 'South African Rand', 'R', 2.3],
  ['BRL', 'Brazilian Real', 'R$', 0.7],
  ['GBP', 'British Pound', '£', 0.098],
];

export const SETTING_DEFAULTS = {
  site_name: 'Mark Six Hub',
  site_description: 'Free Hong Kong Mark Six number picker with the latest results, jackpot estimates and prize breakdown. Pick 6 numbers from 1 to 49 in seconds.',
  announcement: '',
  show_jackpot: '1',
  maintenance: '0',
  history_year_points: '200',
  ticket_points: '10',
  daily_points: '100',
  signup_points: '1000',
  prize_points: '100000,20000,5000,1000,200,50,20',
};

async function hasColumn(table: string, column: string) {
  const rows = await query<RowDataPacket>(
    'SELECT 1 FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?',
    [table, column],
  );
  return rows.length > 0;
}

export async function migrate() {
  for (const sql of TABLES) await exec(sql);

  // Older databases from the Express app only knew 'user' and 'admin'.
  await exec("ALTER TABLE users MODIFY role ENUM('user','viewer','support','editor','admin') NOT NULL DEFAULT 'user'");
  if (!(await hasColumn('users', 'last_login_at'))) await exec('ALTER TABLE users ADD COLUMN last_login_at DATETIME NULL');

  // Extra details for an upcoming draw, as the HKJC lists them. All optional.
  // The HKJC counts "winning units" such as 2.5, so the column must hold one decimal place (data is preserved).
  await exec('ALTER TABLE draw_prizes MODIFY winners DECIMAL(14,1) NOT NULL DEFAULT 0');

  for (const [column, type] of [
    ['stop_selling_time', 'TIME NULL'],
    ['turnover_hkd', 'BIGINT NULL'],
    ['snowball_hkd', 'BIGINT NULL'],
    ['fund_hkd', 'BIGINT NULL'],
  ] as const) {
    if (!(await hasColumn('draws', column))) await exec(`ALTER TABLE draws ADD COLUMN ${column} ${type}`);
  }

  if (!(await hasColumn('saved_sets', 'draw_no'))) await exec('ALTER TABLE saved_sets ADD COLUMN draw_no VARCHAR(8) NULL, ADD KEY idx_draw (draw_no)');

  if (!(await hasColumn('users', 'points'))) await exec('ALTER TABLE users ADD COLUMN points INT NOT NULL DEFAULT 0, ADD COLUMN last_claim DATE NULL');
  if (!(await hasColumn('saved_sets', 'settled'))) {
    await exec('ALTER TABLE saved_sets ADD COLUMN settled TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN won_points INT NOT NULL DEFAULT 0');
    await exec('UPDATE saved_sets SET settled=1'); // tickets saved before points existed never pay
  }

  if (!(await hasColumn('saved_sets', 'order_id'))) {
    await exec('ALTER TABLE saved_sets MODIFY nums VARCHAR(40) NOT NULL, ADD COLUMN order_id INT NULL, ADD COLUMN units INT NOT NULL DEFAULT 1, ADD KEY idx_order (order_id)');
  }

  if (!(await hasColumn('orders', 'refunded'))) await exec('ALTER TABLE orders ADD COLUMN refunded TINYINT(1) NOT NULL DEFAULT 0');

  if (!(await hasColumn('users', 'blocked'))) await exec('ALTER TABLE users ADD COLUMN blocked TINYINT(1) NOT NULL DEFAULT 0');
  if (!(await hasColumn('saved_sets', 'notified'))) {
    await exec('ALTER TABLE saved_sets ADD COLUMN notified TINYINT(1) NOT NULL DEFAULT 0');
    await exec('UPDATE saved_sets SET notified=1'); // only wins from now on are announced
  }

  if (!(await hasColumn('users', 'streak'))) await exec('ALTER TABLE users ADD COLUMN streak INT NOT NULL DEFAULT 0');
  if (!(await hasColumn('users', 'nickname'))) await exec('ALTER TABLE users ADD COLUMN nickname VARCHAR(20) NULL, ADD UNIQUE KEY uq_nickname (nickname)');

  if (!(await hasColumn('users', 'signup_ip'))) await exec('ALTER TABLE users ADD COLUMN signup_ip CHAR(32) NULL, ADD KEY idx_signup_ip (signup_ip)');

  if (!(await hasColumn('users', 'totp_secret'))) await exec('ALTER TABLE users ADD COLUMN totp_secret VARCHAR(40) NULL, ADD COLUMN totp_on TINYINT(1) NOT NULL DEFAULT 0');

  // Orders placed before approvals existed count as accepted.
  if (!(await hasColumn('orders', 'status'))) await exec("ALTER TABLE orders ADD COLUMN status VARCHAR(10) NOT NULL DEFAULT 'accepted', ADD KEY idx_status (status)");

  if (!(await hasColumn('users', 'email_verified'))) {
    await exec('ALTER TABLE users ADD COLUMN email_verified TINYINT(1) NOT NULL DEFAULT 0, ADD COLUMN pending_bonus INT NOT NULL DEFAULT 0');
    await exec('UPDATE users SET email_verified=1'); // accounts that already exist are not asked to confirm
  }

  if (!(await hasColumn('orders', 'order_no'))) {
    await exec('ALTER TABLE orders ADD COLUMN seq INT NULL, ADD COLUMN order_no VARCHAR(20) NULL, ADD UNIQUE KEY uq_order_no (order_no), ADD UNIQUE KEY uq_draw_seq (draw_no, seq)');
  }
  // Orders from before numbering get the next number of their draw, oldest first. Safe to repeat.
  const unnumbered = await query<RowDataPacket & { id: number; draw_no: string }>('SELECT id, draw_no FROM orders WHERE order_no IS NULL ORDER BY id');
  for (const o of unnumbered) {
    const [{ n }] = await query<RowDataPacket & { n: number }>('SELECT COALESCE(MAX(seq), 0) + 1 AS n FROM orders WHERE draw_no=?', [o.draw_no]);
    await exec('UPDATE orders SET seq=?, order_no=? WHERE id=?', [Number(n), makeOrderNo(o.draw_no, Number(n)), o.id]);
  }

  if (!(await hasColumn('users', 'history_years'))) await exec('ALTER TABLE users ADD COLUMN history_years TINYINT NOT NULL DEFAULT 0, ADD COLUMN history_from DATE NULL');

  for (const c of CURRENCIES) await exec('INSERT IGNORE INTO currencies (code, name, symbol, rate) VALUES (?,?,?,?)', c);
  for (const [k, v] of Object.entries(SETTING_DEFAULTS)) await exec('INSERT IGNORE INTO settings (k, v) VALUES (?,?)', [k, v]);

  const [{ n }] = await query<RowDataPacket & { n: number }>('SELECT COUNT(*) AS n FROM faqs');
  if (!Number(n)) {
    for (const [i, f] of FAQS.entries()) await exec('INSERT INTO faqs (question, answer, sort_order) VALUES (?,?,?)', [f.q, f.a, (i + 1) * 10]);
  }

  const email = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || '';
  if (email && password) {
    const admins = await query<RowDataPacket>("SELECT id FROM users WHERE role='admin' LIMIT 1");
    if (!admins.length) {
      await exec("INSERT INTO users (email, pass_hash, role, email_verified) VALUES (?,?,'admin',1) ON DUPLICATE KEY UPDATE role='admin'", [email, await hashPassword(password)]);
      console.log('Admin account ready for', email);
    }
  }
}
