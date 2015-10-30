/**
 * Launch stream with livestreamer
 * @author Martin Giger
 * @license MPL-2.0
 * @module lib/livestreamer
 */

//TODO Fix opening with livestreamer for hsoted twitch channels?
//TODO opening offline channels with livestreamer as default?

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
let livestreamerPathExists = false;

let findLivestreamer = (userPath) => {
    if(!userPath || userPath === "" || !exists(userPath)) {
        return DEFAULT_PATHS[system.platform].find(exists) || "";
    }
    else {
        return userPath;
    }
};

/**
 * Open the givens stream with Livestreamer. Falls back to the fallback quality,
 * if opening with the given quality fails.
 * @argument {string} path - URL of the livestream to open
 * @argument {string} [quality="best"] - The quality to choose. Defaults to the
 *                                       fallback quality.
 */
let launch = function(path, quality = prefs.livestreamer_fallbackQuality) {
    if(livestreamerPathExists) {
        let args = [
            "--default-stream="+prefs.livestreamer_fallbackQuality,
            path,
            quality
        ];
        if(prefs.livestreamer_player !== "")
            args.push("--player="+prefs.livestreamer_player);

        if(prefs.livestreamer_extraArguments !== "")
            args = args.concat(prefs.livestreamer_extraArguments.split(","));

        let livestreamerPath = prefs.livestreamer_path;

        console.log("[Livestreamer]> Spawning", livestreamerPath + " " + args.join(" "));
        startProcess(livestreamerPath, args).catch((exitCode) => {
            // Retry with the fallback quality if the given quality failed.
            if(quality !== prefs.livestreamer_fallbackQuality)
                return launch(path);
        });
    }
    else {
        console.warn("No Livestreamer executable could be located. Try manually setting the path to it.");
    }
};

let eventTarget = new EventTarget();

let updatePath = () => {
    let livestreamerPath = findLivestreamer(prefs.livestreamer_path);
    if(livestreamerPath !== "" && exists(livestreamerPath)) {
        livestreamerPathExists = true;
        livestreamerExists = livestreamerPathExists && !prefs.livestreamer_enabled;
        if(prefs.livestreamer_path === "")
            prefs.livestreamer_path = livestreamerPath;
    }
    else {
        livestreamerExists = false;
        livestreamerPathExists = false;
    }

    emit(eventTarget, "existance", livestreamerExists);
};

updatePath();
preferences.on("livestreamer_path", updatePath);
preferences.on("livestreamer_enabled", updatePath);

module.exports = {
    /**
     * Launches the given stream with livestreamer
     * @argument {string} path - URL to the livestream.
     */
    launch: (path) => launch(path, prefs.livestreamer_quality),
    /**
     * If livestreamer exists but is not the default method
     * @type {boolean}
     * @readonly
     */
    get exists() {
        return livestreamerExists;
    },
    /**
     * Emits an event whenever exists changes the value.
     * @type {external:sdk/event/target}
     * @readonly
     */
    get events() {
        return eventTarget;
    }
};
