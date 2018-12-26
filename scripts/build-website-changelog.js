"use strict";

const conventionalChangelog = require("conventional-changelog"),
    pkg = require("../package.json"),
    stp = require("stream-to-promise"),
    fs = require("fs").promises,
    path = require("path"),
    git = require("simple-git"),

    repo = git(path.resolve(__dirname, '..')),
    file = path.join(__dirname, '..', 'changes', `${pkg.version}.md`),
    promisify = (res, rej) => (err, result) => {
        if(err) {
            rej(err);
        }
        else {
            res(result);
        }
    };

new Promise((resolve, reject) => {
    repo.checkout('gh-pages', promisify(resolve, reject));
})
    .then(() => stp(conventionalChangelog({
        preset: 'angular',
        releaseCount: 2
    }, null, null, null, {
        headerPartial: `---
  title: You've upgraded Live Stream Notifier
  version: v${pkg.version}
  permalink: /changes/${pkg.version}
---`
    })))
    .then((res) => fs.writeFile(file, res))
    .then(() => new Promise((resolve, reject) => {
        repo.add(file, promisify(resolve, reject));
    }))
    .then(() => new Promise((resolve, reject) => {
        repo.commit(`chore(release): ${pkg.version}`, promisify(resolve, reject));
    }))
    .then(() => new Promise((resolve, reject) => {
        repo.push('origin', 'gh-pages', promisify(resolve, reject));
    }))
    .then(() => new Promise((resolve, reject) => {
        repo.checkout('master', promisify(resolve, reject));
    }))
    .catch(console.error);
