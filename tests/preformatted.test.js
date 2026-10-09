const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')
const { JSDOM } = require('jsdom')

test('the CLI preserves line breaks and blank lines in a saved syntax-highlighted code block', () => {
  const source = path.join(__dirname, 'fixtures/norvig-pre.html')
  const expected = readFileSync(path.join(__dirname, 'fixtures/norvig-pre.txt'), 'utf8')
  const result = spawnSync(process.execPath, [
    path.join(__dirname, '../readability-extractor'),
    source,
    'https://norvig.com/spell-correct.html',
    'utf-8',
  ], { encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  const article = JSON.parse(result.stdout)
  const document = new JSDOM(article.content).window.document
  const pre = document.querySelector('pre')
  assert.ok(pre, 'The code block must remain in the extracted article')
  assert.equal(pre.textContent, expected)
  assert.ok(article.textContent.includes(expected), 'Plain text must preserve the same code layout')
  assert.equal(pre.querySelectorAll('p').length, 0, 'Paragraph cleanup must not split code blocks')
})
