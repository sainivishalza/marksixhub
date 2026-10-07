const { q, one } = require('./db');
const { hashPassword } = require('./security');
const cfg = require('./config');

const TABLES = [
  `CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(190) NOT NULL UNIQUE,
    pass_hash VARCHAR(255) NOT NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    currency CHAR(3) NOT NULL DEFAULT 'HKD',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS settings (
    k VARCHAR(40) PRIMARY KEY,
    v TEXT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

// Indicative rates per 1 HKD. The admin must keep these current.
const CURRENCIES = [
  ['HKD', 'Hong Kong Dollar', 'HK$', 1],
  ['INR', 'Indian Rupee', '₹', 11.4],
  ['CAD', 'Canadian Dollar', 'C$', 0.18],
  ['ZAR', 'South African Rand', 'R', 2.3],
  ['BRL', 'Brazilian Real', 'R$', 0.7],
  ['GBP', 'British Pound', '£', 0.098],
];

const SETTINGS = {
  site_name: 'Mark Six Hub',
  site_description:
    'Hong Kong Mark Six results, jackpot prizes, draw calendar and a free number picker, with prizes shown in your currency.',
  announcement: '',
};

async function migrate() {
  for (const sql of TABLES) await q(sql);
  for (const c of CURRENCIES) {
    await q('INSERT IGNORE INTO currencies (code, name, symbol, rate) VALUES (?,?,?,?)', c);
  }
  for (const [k, v] of Object.entries(SETTINGS)) {
    await q('INSERT IGNORE INTO settings (k, v) VALUES (?,?)', [k, v]);
  }
  const hasAdmin = await one("SELECT id FROM users WHERE role='admin' LIMIT 1");
  if (cfg.adminEmail && cfg.adminPassword && !hasAdmin) {
    await q("INSERT INTO users (email, pass_hash, role) VALUES (?,?,'admin')", [
      cfg.adminEmail.toLowerCase(),
      await hashPassword(cfg.adminPassword),
    ]);
    console.log('Admin account created for', cfg.adminEmail);
  }
}

module.exports = { migrate };
