"use strict";

const conventionalChangelog = require("conventional-changelog");
const pkg = require("../package.json");
const stp = require("stream-to-promise");
const fs = require("fs").promises;
const path = require("path");
const git = require("simple-git");

git(path.resolve(__dirname, '..')).checkout('gh-pages', () => {
    stp(conventionalChangelog({
        preset: 'angular',
        releaseCount: 2
    }, null, null, null, {
        headerPartial: `---
      title: You've upgraded Live Stream Notifier
      version: v${pkg.version}
      permalink: /changes/${pkg.version}
    ---`
    }))
        .then((res) => fs.writeFile(path.join(__dirname, '..', 'changes', `${pkg.version}.md`), res))
        .catch(console.error);
});
