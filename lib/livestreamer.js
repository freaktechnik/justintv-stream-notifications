/**
 * Launch stream with livestreamer
 * @author Martin Giger
 * @license MPL-2.0
 * @module lib/livestreamer
 */

//TODO Fix opening with livestreamer for hsoted twitch channels?

"use strict";

let preferences = require("sdk/simple-prefs");
let { prefs } = preferences;
let system = require("sdk/system");
const { startProcess } = require("./livestreamer/process");
const { exists } = require("sdk/io/file");
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");

const DEFAULT_PATHS = {
    "winnt": ["C:\\Program Files (x86)\\Livestreamer\\livestreamer.exe"],
    "linux": ["/usr/local/bin/livestreamer", "/usr/bin/livestreamer"],
    "darwin": ["/Applications/livestreamer.app"]
};

let livestreamerExists = false;

let findLivestreamer = (userPath) => {
    if(!userPath || userPath === "" || !exists(userPath)) {
        return DEFAULT_PATHS[system.platform].find(exists);
    }
    else {
        return userPath;
    }
};

let launch = function(path) {
    if(livestreamerExists) {
        let args = [ path, prefs.livestreamer_quality ];
        if(prefs.livestreamer_player !== "")
            args.push("-p\ "+prefs.livestreamer_player);

        let livestreamerPath = prefs.livestreamer_path;

        console.log("[Livestreamer]> Spawning", livestreamerPath + " " + args.join(" "));
        startProcess(livestreamerPath, args);
    }
    else {
        console.warn("No Livestreamer executable could be located. Try manually setting the path to it.");
    }
};

let eventTarget = new EventTarget();

let updatePath = () => {
    let livestreamerPath = findLivestreamer(prefs.livestreamer_path);
    console.log(livestreamerPath);
    if(livestreamerPath !== undefined && livestreamerPath !== "" && exists(livestreamerPath)) {
        livestreamerExists = true && !prefs.livestreamer_enabled;
        if(prefs.livestreamer_path === "")
            prefs.livestreamer_path = livestreamerPath;
    }
    else {
        livestreamerExists = false;
    }

    emit(eventTarget, "existance", livestreamerExists);
};

updatePath();
preferences.on("livestreamer_path", updatePath);
preferences.on("livestreamer_enabled", updatePath);

module.exports = {
    launch,
    get exists() {
        return livestreamerExists;
    },
    get events() {
        return eventTarget;
    }
};
