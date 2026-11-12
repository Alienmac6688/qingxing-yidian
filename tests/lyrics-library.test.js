// Lyrics-library regression checks: no lyric reproduction, no external API, no direct deployment.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const SONGS = [
  'research-candidates-real-classic-songs-20261111.json',
  'research-candidates-lyrics-20261111-c.json'
];

test('Song cases remain individually loadable and discoverable in the UI', () => {
  const app = read('app.js');
  for (const name of SONGS) assert.ok(app.includes(name), 'missing song fetch: ' + name);
  assert.match(app, /category\s*===\s*['"]歌曲歌词['"]/);
  assert.match(app, /歌曲歌词/);
  let total = 0;
  const ids = new Set();
  for (const name of SONGS) {
    const payload = JSON.parse(read('data/' + name));
    assert.ok(Array.isArray(payload.cases), 'missing cases array: ' + name);
    for (const row of payload.cases) {
      total++;
      assert.equal(row.category, '歌曲歌词');
      assert.ok(row.id && !ids.has(row.id), 'duplicate/missing song ID: ' + row.id);
      ids.add(row.id);
      for (const field of ['title','prompt','check','risk','wake','counter','evidenceStatus','caseKind']) {
        assert.ok(typeof row[field] === 'string' && row[field].trim(), 'missing '+field+' '+row.id);
      }
      if (row.caseKind === 'real-song-interpretation') {
        assert.equal(row.originalExcerpt || '', '', 'do not include copyrighted lyric excerpts');
        assert.match(row.evidenceStatus, /解读|解释|误读|非实证|分析/);
      }
    }
  }
  assert.equal(total, 13, 'expected 13 researched song cases from the two reviewed files');
});

test('Existing incremental case manifest references valid, separate social/religion files', () => {
  const manifest = JSON.parse(read('data/case-manifest.json'));
  assert.equal(manifest.schemaVersion, 1);
  assert.ok(Array.isArray(manifest.files));
  const seen = new Set();
  for (const entry of manifest.files) {
    assert.match(entry.path, /^data\/research-candidates-social-religion-[0-9-]+\.json$/);
    assert.ok(!seen.has(entry.path), 'duplicate manifest path: '+entry.path);
    seen.add(entry.path);
    assert.ok(fs.existsSync(path.join(root, entry.path)), 'missing batch: '+entry.path);
    const payload = JSON.parse(read(entry.path));
    assert.ok(Array.isArray(payload.cases), 'invalid case batch '+entry.path);
    for (const row of payload.cases) {
      assert.ok(row && typeof row.id === 'string' && ['社会','宗教'].includes(row.category));
    }
  }
});
