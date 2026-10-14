import test from 'node:test';
import assert from 'node:assert/strict';
import { htmlToText, parseJsonResult, parseTextResult } from '../src/lib/result-source-rules.ts';

const good = { drawNo: '26/104', date: '2026-09-26', numbers: [4, 28, 31, 44, 47, 48], extra: 19, turnover: 14675740, prizes: [{ division: 1, winners: 0, prize: 8000000 }, { division: 2, winners: 3, prize: 450000 }] };

test('valid JSON is accepted and normalised', () => {
  const r = parseJsonResult(good);
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.result.numbers, [4, 28, 31, 44, 47, 48]);
    assert.equal(r.result.extra, 19);
    assert.equal(r.result.drawNo, '26/104');
    assert.equal(r.result.date, '2026-09-26');
    assert.equal(r.result.turnover, '14675740');
    assert.deepEqual(r.result.prizes, [{ division: 1, winners: '0', prize: '8000000' }, { division: 2, winners: '3', prize: '450000' }]);
  }
});

test('JSON with only numbers is fine', () => assert.ok(parseJsonResult({ numbers: [1, 2, 3, 4, 5, 6], extra: 7 }).ok));

test('every kind of bad JSON is refused, never guessed', () => {
  const bad = (o: unknown) => assert.equal(parseJsonResult(o).ok, false);
  bad(null); bad('x'); bad(42); bad({});
  bad({ ...good, numbers: [1, 2, 3, 4, 5] });
  bad({ ...good, numbers: [1, 2, 3, 4, 5, 5] });
  bad({ ...good, numbers: [1, 2, 3, 4, 5, 50] });
  bad({ ...good, numbers: [0, 2, 3, 4, 5, 6] });
  bad({ ...good, numbers: ['a', 2, 3, 4, 5, 6] });
  bad({ ...good, extra: 4 }); // already a winning number
  bad({ ...good, extra: 50 });
  bad({ ...good, drawNo: '104' });
  bad({ ...good, date: '26/09/2026' });
  bad({ ...good, turnover: -5 });
  bad({ ...good, turnover: '1e9' });
  bad({ ...good, prizes: 'none' });
  bad({ ...good, prizes: [{ division: 8, winners: 1, prize: 1 }] });
  bad({ ...good, prizes: [{ division: 1, winners: 1, prize: 1 }, { division: 1, winners: 2, prize: 2 }] });
  bad({ ...good, prizes: [{ division: 1, winners: 'x', prize: 1 }] });
  bad({ ...good, prizes: [{ division: 1, winners: 1.5, prize: 1 }] });
});

test('htmlToText drops scripts and styles, tags and entities', () => {
  const t = htmlToText('<html><style>.a{color:red}</style><script>var x="1 2 3 4 5 6 7"</script><b>Draw</b>&nbsp;26/104 <!-- note -->&amp; 1st &#36;1,000</html>');
  assert.equal(t, 'Draw 26/104 & 1st $1,000');
});

test('a results page as HTML is read with the paste reader', () => {
  const html = '<div>Draw 26/104 26/09/2026</div><ul><li>4</li><li>28</li><li>31</li><li>44</li><li>47</li><li>48</li><li class="x">Extra</li><li>19</li></ul>';
  const r = parseTextResult(html);
  assert.ok(r.ok);
  if (r.ok) {
    assert.deepEqual(r.result.numbers, [4, 28, 31, 44, 47, 48]);
    assert.equal(r.result.extra, 19);
    assert.equal(r.result.drawNo, '26/104');
    assert.equal(r.result.date, '2026-09-26');
  }
});

test('a page with no numbers is refused with a useful message', () => {
  const r = parseTextResult('<html><body><div id="app"></div><script>render()</script></body></html>');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.error, /paste box|type them/);
});
