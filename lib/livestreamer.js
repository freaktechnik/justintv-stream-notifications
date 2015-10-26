/**
 * Launch stream with livestreamer
 * @author Martin Giger
 * @license MPL-2.0
 * @module lib/livestreamer
 */

"use strict";

let { prefs } = require("sdk/simple-prefs");
let system = require("sdk/system");
const { startProcess } = require("./livestreamer/process");
const { exists } = require("sdk/io/file");

const DEFAULT_PATHS = {
    "winnt": ["C:\\Program Files (x86)\\Livestreamer\\livestreamer.exe"],
    "linux": ["/usr/local/bin/livestreamer", "/usr/bin/livestreamer"],
    "darwin": ["/Applications/livestreamer.app"]
};

let findLivestreamer = (userPath) => {
    if(userPath === "" || !exists(userPath)) {
        return DEFAULT_PATHS[system.platform].find(exists);
    }
    else {
        return userPath;
    }
};

let launch = function(path) {
    let args = [ path, prefs.livestreamer_quality ];
    if(prefs.livestreamer_player !== "")
        args.push("-p\ "+prefs.livestreamer_player);

    let livestreamerPath = findLivestreamer(prefs.livestreamer_path);

    console.log("[Livestreamer]> Spawning", livestreamerPath + " " + args.join(" "));
    startProcess(livestreamerPath, args);
};

exports.launch = launch;
