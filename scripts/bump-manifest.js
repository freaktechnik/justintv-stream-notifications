"use strict";

const path = require("path");
const fs = require("fs").promises;
const pkg = require("../package.json");
const manifest = path.resolve(__dirname, '..', 'webextension', 'manifest.json');

fs.readFile(manifest).then((f) => {
    const json = JSON.parse(f);
    json.version = pkg.version;
    return fs.writeFile(manifest, JSON.stringify(json, null, 2));
}).catch(console.error);
