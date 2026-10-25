const assert = require('node:assert/strict')
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')
const { JSDOM } = require('jsdom')

const prose = 'Résumé 中文 🤝 An archived article must preserve its meaningful text and ordinary images while protecting extraction from enormous embedded resources. '.repeat(30)
const smallImage = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>').toString('base64')
const largeImage = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><metadata>' + 'x'.repeat(4 * 1024 * 1024) + '</metadata><rect width="20" height="20" fill="blue"/></svg>').toString('base64')

function extract(body) {
  const dir = mkdtempSync(path.join(tmpdir(), 'readability-data-urls-'))
  try {
    const source = path.join(dir, 'article.html')
    writeFileSync(source, `<html><body><article><h1>Embedded resources</h1><p>${prose}</p>${body}<p>${prose}</p></article></body></html>`)
    const result = spawnSync(process.execPath, [
      '--max-old-space-size=192',
      path.join(__dirname, '../readability-extractor'),
      source,
      'https://example.com/article',
      'utf-8',
    ], { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 30000 })
    assert.equal(result.status, 0, result.stderr)
    const article = JSON.parse(result.stdout)
    assert.ok(article.textContent.includes(prose.trim()), 'The full article prose must survive')
    assert.ok(article.content.length < 100000, 'Oversized data payloads must not enter the extracted HTML')
    return new JSDOM(article.content).window.document
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('the real CLI bounds a large inline image below the old total-HTML threshold', () => {
  const doc = extract(`<img src="${largeImage}" alt="large"><img src="${smallImage}" alt="small"><img src="https://example.com/photo.png" alt="remote">`)
  assert.equal(doc.querySelector('img[alt="small"]').getAttribute('src'), smallImage)
  assert.equal(doc.querySelector('img[alt="remote"]').getAttribute('src'), 'https://example.com/photo.png')
  assert.ok(!doc.querySelector('img[alt="large"]').getAttribute('src').includes(largeImage))
})

test('quoted, unquoted, and line-wrapped data URLs preserve neighboring attributes and sanitization', () => {
  const wrapped = largeImage.replace(/(.{4096})/g, '$1\n')
  const doc = extract(`<img src=${largeImage} alt="unquoted" width="42"><img src='${wrapped}' alt="wrapped" width="43"><img src="${largeImage}" alt="quoted &quot; label" width="44" onerror="alert(1)"><a href="data:text/html;base64,${largeImage.split(',')[1]}">unsafe link</a><script>alert(1)</script>`)
  for (const width of ['42', '43', '44']) assert.ok(doc.querySelector(`img[width="${width}"]`), 'A URL must not consume neighboring attributes')
  assert.equal(doc.querySelector('img[width="44"]').getAttribute('alt'), 'quoted " label')
  assert.equal(doc.querySelector('[onerror], script'), null)
  assert.equal(doc.querySelector('a[href^="data:"]'), null)
})

test('percent-encoded data URLs are bounded without treating neighboring text as a URL', () => {
  const encoded = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg"><metadata>' + 'x'.repeat(2 * 1024 * 1024) + '</metadata></svg>')
  const doc = extract(`<img src="${encoded}" alt="encoded"><p>metadata: ordinary article text remains intact.</p><img src="${smallImage}" alt="small">`)
  assert.ok(doc.body.textContent.includes('metadata: ordinary article text remains intact.'))
  assert.equal(doc.querySelector('img[alt="small"]').getAttribute('src'), smallImage)
})

test('large unquoted data URLs at the end of a saved page do not backtrack looking for quotes', () => {
  // This is valid SVG, and the HTML deliberately has no closing quote after its
  // unquoted src: the old wildcard guard searched the entire payload repeatedly.
  const image = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><metadata>' + 'x'.repeat(12 * 1024 * 1024) + '</metadata></svg>').toString('base64')
  const doc = extract(`<img src=${image} alt=last>`)
  assert.ok(doc.querySelector('img[alt="last"]'))
})
