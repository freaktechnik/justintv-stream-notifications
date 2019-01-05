"use strict";

const pkg = require("../package.json"),
    fs = require("fs").promises,
    path = require("path"),
    git = require("simple-git"),

    repo = git(path.resolve(__dirname, '..')),
    file = path.join(__dirname, '..', 'changes', `${pkg.version}.md`),
    content = `---
title: You've upgraded Live Stream Notifier
version: v${pkg.version}
permalink: /changes/${pkg.version}
---`,
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
    .then((res) => fs.writeFile(file, content, res))
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
