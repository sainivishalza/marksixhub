export type Role = 'user' | 'viewer' | 'support' | 'editor' | 'admin';
export type Level = 'view' | 'support' | 'content' | 'manage';

export const ROLES: Role[] = ['user', 'viewer', 'support', 'editor', 'admin'];

const RANK: Record<Role, number> = { user: 0, viewer: 1, support: 2, editor: 3, admin: 4 };
const NEEDS: Record<Level, number> = { view: 1, support: 2, content: 3, manage: 4 };

/**
 * view: read the dashboard, draws, orders and events (viewer and up).
 * support: look up users and refund orders (support and up).
 * content: edit draws, events, FAQs and SEO text (editor and up).
 * manage: points, roles, currencies, settings, audit log (admin only).
 */
export const can = (role: Role | undefined, level: Level) => role !== undefined && RANK[role] >= NEEDS[level];

export const isRole = (v: unknown): v is Role => typeof v === 'string' && (ROLES as string[]).includes(v);
