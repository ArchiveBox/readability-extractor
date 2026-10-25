const assert = require('node:assert/strict')
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')

test('the real CLI ignores unused modern styles without changing or weakening article extraction', () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'readability-styles-'))
  try {
    const prose = 'An archived article preserves its meaningful prose and images independently of the original website stylesheet. '.repeat(30)
    const style = '<style>@layer article { p { color: rebeccapurple; } }</style>'
    const article = `<article><h1>Saved article</h1><p>${prose}</p><img src="https://example.com/photo.png" onerror="alert(1)"><script>alert(1)</script><p>${prose}</p></article>`
    const results = [style, ''].map((stylesheet, index) => {
      const source = path.join(dir, `article-${index}.html`)
      writeFileSync(source, `<html><head>${stylesheet}</head><body>${stylesheet}${article}</body></html>`)
      const result = spawnSync(process.execPath, [
        path.join(__dirname, '../readability-extractor'), source, 'https://example.com/article',
      ], { encoding: 'utf8', timeout: 30000 })
      assert.equal(result.status, 0, result.stderr)
      return result
    })
    assert.deepEqual(JSON.parse(results[0].stdout), JSON.parse(results[1].stdout))
    const extracted = JSON.parse(results[0].stdout)
    assert.ok(extracted.textContent.includes(prose.trim()))
    assert.ok(extracted.content.includes('https://example.com/photo.png'))
    assert.doesNotMatch(extracted.content, /<style|<script|onerror=/i)
    // Readability discards styles itself: valid CSS unsupported by jsdom must
    // not dump the entire unused stylesheet into capture error logs first.
    assert.equal(results[0].stderr, '')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
