/**
 * Launch stream with livestreamer
 * @author Martin Giger
 * @license MPL-2.0
 * @module livestreamer
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
const { Task: { async } } = require("resource://gre/modules/Task.jsm");

const DEFAULT_PATHS = {
    "winnt": ["C:\\Program Files (x86)\\Livestreamer\\livestreamer.exe"],
    "linux": ["/usr/local/bin/livestreamer", "/usr/bin/livestreamer"],
    "darwin": ["/Applications/livestreamer.app"]
};

let showLivestreamer = false;
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
let launchLivestreamer = function(path, quality = prefs.livestreamer_fallbackQuality) {
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
        return startProcess(livestreamerPath, args);
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
        showLivestreamer = livestreamerPathExists && !prefs.livestreamer_enabled;
        if(prefs.livestreamer_path === "")
            prefs.livestreamer_path = livestreamerPath;
    }
    else {
        showLivestreamer = false;
        livestreamerPathExists = false;
    }

    emit(eventTarget, "existance", showLivestreamer);
};

updatePath();
preferences.on("livestreamer_path", updatePath);
preferences.on("livestreamer_enabled", updatePath);

module.exports = {
    /**
     * Launches the given stream with livestreamer
     * @argument {string} path - URL to the livestream.
     */
    launch: async(function*(path) {
        // Quality chain
        let qualities = [
            prefs.livestreamer_quality,
            prefs.livestreamer_fallbackQuality
        ];
        let currentQuality, exit = 1;

        do {
            currentQuality = qualities.shift();
            exit = yield launchLivestreamer(path, currentQuality).then((c) => c, (c) => c);
        } while(exit !== 0 &&
                qualities.length > 0 &&
                currentQuality != qualities[0]);
    }),
    /**
     * If livestreamer exists but is not the default method
     * @type {boolean}
     * @readonly
     */
    get show() {
        return showLivestreamer;
    },
    /**
     * Emits an event whenever exists changes the value.
     * @type {external:sdk/event/target}
     * @readonly
     */
    get events() {
        return eventTarget;
    },
    /**
     * Indicates if livestreamer is the default action.
     * @type {boolean}
     * @readonly
     */
    get default() {
        return prefs.livestreamer_enabled;
    }
};
