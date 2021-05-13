# Readability-Extractor

This is a tiny JS wrapper library around Mozilla's article-text extraction tool https://github.com/mozilla/readability.

It's designed to be used as an [ArchiveBox](https://github.com/pirate/ArchiveBox) archive method.

## Install

```bash
npm install -g 'git+https://github.com/pirate/readability-extractor'

# which is equivalent to this:
curl https://raw.githubusercontent.com/pirate/readability-extractor/master/readability-extractor > /usr/local/bin/readability-extractor
chmod +x /usr/local/bin/readability-extractor
```

## Usage
```bash
readability-extractor some_article.html 'https://exmaple.com/original/url/some/article.html' > some_article.json
```
```json
{
    "title":"Title autodetected from article html",
    "byline": "Autodetected author...",
    "excerpt": "Autodetected short description",
    "dir": "ltr",
    "length": 1337,
    "content": "<div id=\"readability-page-1\" class=\"page\">abc some article body text...</div>",
    "textContent": "abc some article body text...",
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
