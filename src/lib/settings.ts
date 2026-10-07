import 'server-only';
import type { RowDataPacket } from 'mysql2/promise';
import { dbConfigured, exec, query } from './db';
import { SETTING_DEFAULTS } from './migrate';

export type Settings = {
  siteName: string;
  siteDescription: string;
  announcement: string;
  showJackpot: boolean;
  maintenance: boolean;
  ticketPoints: number;
  /** Points for each year of older results. */
  historyYearPoints: number;
  dailyPoints: number;
  signupPoints: number;
  /** Points won for divisions 1 to 7. */
  prizePoints: number[];
};

const nat = (v: string | undefined, d: number) => (v !== undefined && /^\d{1,9}$/.test(v) ? Number(v) : d);
const DEFAULT_PRIZES = [100000, 20000, 5000, 1000, 200, 50, 20];

const TTL = 30_000;
let cache: { at: number; value: Settings } | null = null;

const DEFAULTS: Settings = {
  siteName: SETTING_DEFAULTS.site_name,
  siteDescription: SETTING_DEFAULTS.site_description,
  announcement: '',
  showJackpot: true,
  maintenance: false,
  ticketPoints: 10,
  historyYearPoints: 200,
  dailyPoints: 100,
  signupPoints: 1000,
  prizePoints: DEFAULT_PRIZES,
};

export async function getSettings(): Promise<Settings> {
  if (cache && Date.now() - cache.at < TTL) return cache.value;
  let value = DEFAULTS;
  if (dbConfigured) {
    try {
      const rows = await query<RowDataPacket & { k: string; v: string }>('SELECT k, v FROM settings');
      const m = Object.fromEntries(rows.map((r) => [r.k, r.v]));
      value = {
        siteName: m.site_name || DEFAULTS.siteName,
        siteDescription: m.site_description || DEFAULTS.siteDescription,
        announcement: m.announcement || '',
        showJackpot: m.show_jackpot !== '0',
        maintenance: m.maintenance === '1',
        ticketPoints: nat(m.ticket_points, 10),
        historyYearPoints: nat(m.history_year_points, 200),
        dailyPoints: nat(m.daily_points, 100),
        signupPoints: nat(m.signup_points, 1000),
        prizePoints: DEFAULT_PRIZES.map((d, i) => nat(m.prize_points?.split(',')[i]?.trim(), d)),
      };
    } catch (err) {
      console.error('settings unavailable, using defaults:', err);
    }
  }
  cache = { at: Date.now(), value };
  return value;
}

export async function saveSettings(s: Settings) {
  const rows: [string, string][] = [
    ['site_name', s.siteName],
    ['site_description', s.siteDescription],
    ['announcement', s.announcement],
    ['show_jackpot', s.showJackpot ? '1' : '0'],
    ['maintenance', s.maintenance ? '1' : '0'],
    ['ticket_points', String(s.ticketPoints)],
    ['history_year_points', String(s.historyYearPoints)],
    ['daily_points', String(s.dailyPoints)],
    ['signup_points', String(s.signupPoints)],
    ['prize_points', s.prizePoints.join(',')],
  ];
  for (const [k, v] of rows) await exec('REPLACE INTO settings (k, v) VALUES (?,?)', [k, v]);
  cache = null;
}

type SeoRow = RowDataPacket & { path: string; title: string; description: string };
let seoCache: { at: number; value: Record<string, { title: string; description: string }> } | null = null;

export async function getSeoOverrides() {
  if (seoCache && Date.now() - seoCache.at < TTL) return seoCache.value;
  let value: Record<string, { title: string; description: string }> = {};
  if (dbConfigured) {
    try {
      value = Object.fromEntries((await query<SeoRow>('SELECT path, title, description FROM page_seo')).map((r) => [r.path, { title: r.title, description: r.description }]));
    } catch (err) {
      console.error('seo overrides unavailable:', err);
    }
  }
  seoCache = { at: Date.now(), value };
  return value;
}

export async function saveSeo(path: string, title: string, description: string) {
  if (!title && !description) await exec('DELETE FROM page_seo WHERE path=?', [path]);
  else await exec('REPLACE INTO page_seo (path, title, description) VALUES (?,?,?)', [path, title, description]);
  seoCache = null;
}
