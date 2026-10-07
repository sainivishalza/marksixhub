export type Role = 'user' | 'viewer' | 'editor' | 'admin';
export type Level = 'view' | 'content' | 'manage';

export const ROLES: Role[] = ['user', 'viewer', 'editor', 'admin'];

const RANK: Record<Role, number> = { user: 0, viewer: 1, editor: 2, admin: 3 };
const NEEDS: Record<Level, number> = { view: 1, content: 2, manage: 3 };

/**
 * view: read the dashboard, draws and events (viewer and up).
 * content: edit draws, events, FAQs and SEO text (editor and up).
 * manage: users, currencies and site settings (admin only).
 */
export const can = (role: Role | undefined, level: Level) => role !== undefined && RANK[role] >= NEEDS[level];

export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as string[]).includes(v);
