"use strict";

const path = require("path"),
    fs = require("fs").promises,
    pkg = require("../package.json"),
    manifest = path.resolve(__dirname, '..', 'webextension', 'manifest.json'),

    MANIFEST_INDENT = 4;

fs.readFile(manifest).then((f) => {
    const json = JSON.parse(f);
    json.version = pkg.version;
    return fs.writeFile(manifest, JSON.stringify(json, null, MANIFEST_INDENT));
})
    .catch(console.error);
