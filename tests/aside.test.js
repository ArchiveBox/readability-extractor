const assert = require('node:assert/strict')
const { mkdtempSync, writeFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const test = require('node:test')
const { JSDOM } = require('jsdom')

for (const repetitions of [1, 30]) {
  for (const placement of ['before', 'after']) {
    test(`aside descendants cannot replace an article (${repetitions} paragraphs, ${placement})`, () => {
      const dir = mkdtempSync(path.join(tmpdir(), 'readability-aside-'))
      try {
        const prose = 'The observatory recorded a bright meteor above the northern ridge. The accompanying photograph preserves its luminous trail across the evening sky.'
        const paragraphs = `<p>${prose}</p>`.repeat(repetitions)
        const sectionText = 'The instrument retained its calibration throughout the observation.'
        const section = `<section><h2>Instrument notes</h2><p>${sectionText} <a href="https://example.com/calibration">Calibration report</a></p></section>`
        const article = `<main><article><h1>Observatory field report</h1>${paragraphs}${section}<figure><img src="https://example.com/meteor.png" alt="Meteor trail"><figcaption>The meteor above the ridge.</figcaption></figure></article></main>`
        const asideText = 'The supplementary bulletin describes membership benefits, local meetings, publications, and the organization of the association. '.repeat(12)
        const aside = `<aside><section><h2>Supplementary bulletin</h2><div><p>${asideText}</p></div></section></aside>`
        const outputs = ['', aside].map((sidebar, index) => {
          const body = placement === 'before' ? sidebar + article : article + sidebar
          const source = path.join(dir, `article-${index}.html`)
          writeFileSync(source, `<html><head><title>Observatory field report</title></head><body>${body}</body></html>`)
          const result = spawnSync(process.execPath, [
            path.join(__dirname, '../readability-extractor'), source, 'https://example.com/report',
          ], { encoding: 'utf8', timeout: 30000 })
          assert.equal(result.status, 0, result.stderr)
          return JSON.parse(result.stdout)
        })
        for (const [index, output] of outputs.entries()) {
          assert.ok(output.textContent.includes(prose), `The article prose must remain (with aside: ${index === 1})`)
          assert.ok(output.textContent.includes(sectionText), 'Ordinary article sections must remain')
          assert.ok(!output.textContent.includes('Supplementary bulletin'), 'Complementary content must remain excluded')
          const document = new JSDOM(output.content).window.document
          assert.equal(document.querySelector('a')?.getAttribute('href'), 'https://example.com/calibration')
          assert.equal(document.querySelector('img')?.getAttribute('src'), 'https://example.com/meteor.png')
          assert.ok(document.querySelector('figcaption')?.textContent.includes('The meteor above the ridge.'))
        }
        assert.deepEqual(outputs[1], outputs[0], 'Adding an excluded aside must not change the extracted article')
      } finally {
        rmSync(dir, { recursive: true, force: true })
      }
    })
  }
}
