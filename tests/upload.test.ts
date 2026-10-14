import test from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { csvProblem, xlsxProblem } from '../src/lib/upload-rules.ts';
import { readXlsx } from '../src/lib/xlsx.ts';

const PK = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0]);

test('xlsx: only a real zip named .xlsx under the size limit passes', () => {
  assert.equal(xlsxProblem({ name: 'results.xlsx', size: 1000, head: PK }), null);
  assert.equal(xlsxProblem({ name: 'RESULTS.XLSX', size: 1000, head: PK }), null);
  assert.match(xlsxProblem({ name: 'results.xlsx', size: 0, head: PK })!, /Choose/);
  assert.match(xlsxProblem({ name: 'results.exe', size: 1000, head: PK })!, /\.xlsx/);
  assert.match(xlsxProblem({ name: 'results.xlsx.exe', size: 1000, head: PK })!, /\.xlsx/);
  assert.match(xlsxProblem({ name: 'results', size: 1000, head: PK })!, /\.xlsx/);
  assert.match(xlsxProblem({ name: 'results.xlsx', size: 5_000_001, head: PK })!, /too large/);
  assert.match(xlsxProblem({ name: 'results.xlsx', size: 1000, head: new Uint8Array([0x4d, 0x5a, 0x90, 0]) })!, /not a real/); // an .exe renamed
  assert.match(xlsxProblem({ name: 'results.xlsx', size: 1000, head: new Uint8Array([0x25, 0x50, 0x44, 0x46]) })!, /not a real/); // a PDF renamed
  assert.match(xlsxProblem({ name: 'results.xlsx', size: 1000, head: new Uint8Array([]) })!, /not a real/);
});

test('csv: plain text only', () => {
  const ok = { name: 'draws.csv', type: 'text/csv', size: 100, text: 'draw_no,draw_date\n' };
  assert.equal(csvProblem(ok), null);
  assert.equal(csvProblem({ ...ok, name: 'draws.txt', type: 'text/plain' }), null);
  assert.equal(csvProblem({ ...ok, type: '' }), null);
  assert.equal(csvProblem({ ...ok, type: 'text/csv; charset=utf-8' }), null);
  assert.match(csvProblem({ ...ok, name: 'draws.html' })!, /\.csv/);
  assert.match(csvProblem({ ...ok, name: 'draws.csv.php' })!, /\.csv/);
  assert.match(csvProblem({ ...ok, type: 'application/x-msdownload' })!, /CSV/);
  assert.match(csvProblem({ ...ok, type: 'image/png' })!, /CSV/);
  assert.match(csvProblem({ ...ok, size: 500_001 })!, /too large/);
  assert.match(csvProblem({ ...ok, text: 'a,b\u0000c' })!, /plain text/);
});

// A minimal one-file zip, enough for the reader.
function zip(name: string, data: Buffer): Buffer {
  const comp = deflateRawSync(data);
  const nameB = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameB.length, 26);
  const cd = Buffer.alloc(46);
  cd.writeUInt32LE(0x02014b50, 0);
  cd.writeUInt16LE(8, 10);
  cd.writeUInt32LE(comp.length, 20);
  cd.writeUInt32LE(data.length, 24);
  cd.writeUInt16LE(nameB.length, 28);
  cd.writeUInt32LE(0, 42);
  const body = Buffer.concat([local, nameB, comp]);
  const dir = Buffer.concat([cd, nameB]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(dir.length, 12);
  end.writeUInt32LE(body.length, 16);
  return Buffer.concat([body, dir, end]);
}

test('xlsx reader: a zip bomb is refused instead of filling memory', () => {
  const bomb = zip('xl/worksheets/sheet1.xml', Buffer.alloc(80_000_000)); // 80 MB of zeros, about 80 KB zipped
  assert.ok(bomb.length < 200_000);
  assert.throws(() => readXlsx(bomb), /damaged|too large/);
});

test('xlsx reader: random bytes and truncated files fail with a plain message, not a crash', () => {
  assert.throws(() => readXlsx(Buffer.from('this is not a zip file at all')), /not an Excel/);
  const good = zip('xl/worksheets/sheet1.xml', Buffer.from('<worksheet><sheetData></sheetData></worksheet>'));
  for (const cut of [10, 30, good.length - 30, good.length - 10]) assert.throws(() => readXlsx(good.subarray(0, cut)), /not an Excel|damaged/);
});

test('xlsx reader: a sheet reference with regex characters cannot break the reader', () => {
  const evil = '<workbook><sheets><sheet name="a" r:id="(a+)+$"/></sheets></workbook>';
  const f = zip('xl/workbook.xml', Buffer.from(evil));
  assert.throws(() => readXlsx(f), /No worksheet/);
});
