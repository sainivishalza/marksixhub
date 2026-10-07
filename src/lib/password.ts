import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

type Scrypt = (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number }) => Promise<Buffer>;
const scrypt = promisify(scryptCb) as unknown as Scrypt;
const OPTS = { N: 16384, r: 8, p: 1 };

// Same format as the legacy Express app ("s1$salt$hash"), so existing accounts keep working.
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64, OPTS);
  return `s1$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [version, salt, hash] = String(stored).split('$');
  if (version !== 's1' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64');
  const actual = await scrypt(password, Buffer.from(salt, 'base64'), expected.length, OPTS);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** A valid-looking hash to verify against when the email is unknown, so timing does not reveal which emails exist. */
export const DUMMY_HASH = 's1$AAAAAAAAAAAAAAAAAAAAAA==$' + Buffer.alloc(64).toString('base64');
