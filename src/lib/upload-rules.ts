// What an uploaded file must look like before it is read. The browser's idea of the type is only a hint (anyone can send anything),
// so the file name and the first bytes are checked as well, and size limits apply before the file is opened.

export const MAX_XLSX_BYTES = 5_000_000;
export const MAX_CSV_BYTES = 500_000;

const ext = (name: string) => (/\.([A-Za-z0-9]{1,8})$/.exec(name.trim())?.[1] ?? '').toLowerCase();

/** An Excel workbook is a zip file: its first four bytes are "PK\x03\x04". Returns a sentence when the file is not acceptable. */
export function xlsxProblem(f: { name: string; size: number; head: Uint8Array }): string | null {
  if (f.size === 0) return 'Choose an Excel (.xlsx) file.';
  if (ext(f.name) !== 'xlsx') return 'Only Excel files ending in .xlsx are accepted.';
  if (f.size > MAX_XLSX_BYTES) return 'That file is too large. Keep it under 5 MB.';
  const h = f.head;
  if (!(h[0] === 0x50 && h[1] === 0x4b && h[2] === 0x03 && h[3] === 0x04)) return 'That file is not a real Excel (.xlsx) file.';
  return null;
}

const CSV_TYPES = new Set(['', 'text/csv', 'text/plain', 'application/csv', 'application/vnd.ms-excel']);

/** A CSV is plain text: no binary bytes, a text-like type, a .csv or .txt name. */
export function csvProblem(f: { name: string; type: string; size: number; text: string }): string | null {
  if (!['csv', 'txt'].includes(ext(f.name))) return 'Only .csv or .txt files are accepted.';
  if (!CSV_TYPES.has(f.type.toLowerCase().split(';')[0].trim())) return 'That does not look like a CSV text file.';
  if (f.size > MAX_CSV_BYTES) return 'That file is too large. Keep it under 500 KB.';
  if (f.text.includes('\u0000')) return 'That file is not plain text.';
  return null;
}
