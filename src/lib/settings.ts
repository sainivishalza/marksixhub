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
};

const TTL = 30_000;
let cache: { at: number; value: Settings } | null = null;

const DEFAULTS: Settings = {
  siteName: SETTING_DEFAULTS.site_name,
  siteDescription: SETTING_DEFAULTS.site_description,
  announcement: '',
  showJackpot: true,
  maintenance: false,
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
