import { inflateRawSync } from 'node:zlib';

// A small .xlsx reader: enough to read one sheet of text, numbers and dates. No dependencies.
export type Cell = string | number | null;

function unzip(buf: Buffer): Map<string, Buffer> {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65_557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This is not an Excel (.xlsx) file.');
  const count = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const files = new Map<string, Buffer>();
  for (let n = 0; n < count; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('The Excel file is damaged.');
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(start, start + size);
    if (method === 0) files.set(name, raw);
    else if (method === 8) files.set(name, inflateRawSync(raw));
    p += 46 + nameLen + extraLen + commentLen;
  }
  return files;
}

const decode = (s: string) =>
  s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');

const text = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => decode(m[1])).join('');
const col = (ref: string) => [...ref.replace(/\d+/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Rows of the first sheet. Empty cells are null; numbers stay numbers. */
export function readXlsx(buf: Buffer): Cell[][] {
  const files = unzip(buf);
  const get = (n: string) => files.get(n)?.toString('utf8') ?? '';
  const workbook = get('xl/workbook.xml');
  const rid = /<sheet\b[^>]*\br:id="([^"]+)"/.exec(workbook)?.[1];
  const rels = get('xl/_rels/workbook.xml.rels');
  const target = rid ? new RegExp(`<Relationship\\b[^>]*\\bId="${rid}"[^>]*>`).exec(rels)?.[0].match(/Target="([^"]+)"/)?.[1] : undefined;
  const path = target ? (target.startsWith('/') ? target.slice(1) : `xl/${target}`) : 'xl/worksheets/sheet1.xml';
  const sheet = get(path);
  if (!sheet) throw new Error('No worksheet found in the Excel file.');
  const shared = [...get('xl/sharedStrings.xml').matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g)].map((m) => text(m[1]));

  const rows: Cell[][] = [];
  for (const r of sheet.matchAll(/<row\b[^>]*?(?:\/>|>([\s\S]*?)<\/row>)/g)) {
    const row: Cell[] = [];
    for (const c of (r[1] ?? '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = c[1];
      const ref = /\br="([A-Z]+\d+)"/.exec(attrs)?.[1];
      const type = /\bt="([^"]+)"/.exec(attrs)?.[1];
      const inner = c[2] ?? '';
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];
      let value: Cell = null;
      if (type === 'inlineStr') value = text(inner);
      else if (v !== undefined) {
        if (type === 's') value = shared[Number(v)] ?? null;
        else if (type === 'str' || type === 'e') value = decode(v);
        else if (type === 'b') value = Number(v);
        else value = Number(v);
      }
      row[ref ? col(ref) : row.length] = value;
    }
    rows.push(Array.from(row, (x) => x ?? null));
  }
  return rows;
}

/** Excel stores a real date as a day count since 1899-12-30. */
export const excelSerialToIso = (n: number) => new Date(Date.UTC(1899, 11, 30) + Math.round(n) * 86_400_000).toISOString().slice(0, 10);
