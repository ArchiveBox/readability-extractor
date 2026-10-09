# Readability-Extractor

This is a tiny JS wrapper library around Mozilla's article-text extraction tool https://github.com/mozilla/readability.

It's designed to be used as an [ArchiveBox](https://github.com/pirate/ArchiveBox) extractor.

## Install

```bash
npm install -g 'git+https://github.com/pirate/readability-extractor'

# which is equivalent to this:
curl https://raw.githubusercontent.com/pirate/readability-extractor/master/readability-extractor > /usr/local/bin/readability-extractor
chmod +x /usr/local/bin/readability-extractor
```

## Usage
```bash
# readability-extractor <input HTML path> <original url?> <suggested encoding?> > <output JSON path>
readability-extractor some_article.html 'https://exmaple.com/original/url/some/article.html' 'UTF-8' > some_article.json
```
```json
{
    "title": "Title autodetected from article html",
    "byline": "Autodetected author...",
    "excerpt": "Autodetected short description",
    "dir": "ltr",
    "length": 1337,
    "lang": null,
    "charset": "UTF-8",
    "content": "<div id=\"readability-page-1\" class=\"page\">abc some article body text...</div>",
    "textContent": "abc some article body text..."
}
```

## ArchiveBox Integration

```bash
# You don't have to run these commands usually.
# Readability is on by default and ArchiveBox will find any 
# installed version in your $PATH automatically

# However, if you explicitly want to turn readability on
# and/or specify a manual path to the binary, you can do this:
archivebox config --set SAVE_READABILITY=True
archivebox config --set READABILITY_BINARY="$(which readability-extractor)"

# test archiving oneshot using only singlefile+readability
archivebox add --extract=singlefile,readability 'https://exmaple.com'
```

## Development and releases

Run `npm ci` and `npm test`. The regression tests invoke the real CLI against saved HTML.

`.github/workflows/release.yml` tests pushes and pull requests. A `v<VERSION>` tag
publishes the matching `package.json` version to npm using GitHub Actions OIDC.
Before the first automated release, the npm package maintainer must configure a
[trusted publisher](https://docs.npmjs.com/trusted-publishers/) in the
[package settings](https://www.npmjs.com/package/readability-extractor/access):
GitHub organization `ArchiveBox`, repository `readability-extractor`, workflow
filename `release.yml`, no environment, with permission to publish. No npm token
or GitHub Actions secret is required.

To release, update the version with `npm version patch --no-git-tag-version`,
commit and push the version files, wait for the main-branch checks to pass, then
create and push the matching tag. Verify the version with
`npm view readability-extractor version` before announcing publication.
ArchiveBox's Readability plugin installs this npm package through its pnpm
provider; a GitHub source push alone does not update that installed binary.
