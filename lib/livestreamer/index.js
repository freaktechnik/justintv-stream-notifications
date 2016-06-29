/**
 * Launch stream with livestreamer
 * @author Martin Giger
 * @license MPL-2.0
 * @module livestreamer
 * @todo implement a proper which.
 */

"use strict";

import preferences from "sdk/simple-prefs";
import system from "sdk/system";
import { startProcess } from "./process";
import { exists } from "sdk/io/file";
import EventTarget from "../event-target";
import { emit } from "sdk/event/core";
import ParentalControls from "../parental-controls";
import { unique } from "sdk/util/array";

const { prefs } = preferences;
/**
 * Default livestreamer paths by platform.
 * @const {Object.<string,Array.<string>>}
 * @todo use $PATH for search.
 */
const DEFAULT_PATHS = {
    "winnt": ["C:\\Program Files (x86)\\Livestreamer\\livestreamer.exe"],
    "linux": ["/usr/local/bin/livestreamer", "/usr/bin/livestreamer"],
    "darwin": ["/Applications/livestreamer.app"]
};

let showLivestreamer = false;
let livestreamerPathExists = false;
let livestreamerPath = "";

/**
 * Tries to find Livestreamer if it's not in the user defined path.
 * @argument {string} userPath - User defined path to livestreamer
 * @return {string} A path to Livestreamer if it exists, else an empty string.
 */
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

        console.log("[Livestreamer]> Spawning", livestreamerPath + " " + args.join(" "));
        return startProcess(livestreamerPath, args);
    }
    else {
        return Promise.reject(1);
    }
};

const canHandleURL = (path) => {
    if(livestreamerPathExists) {
        let args = [
            "--can-handle-url="+path
        ];

        console.log("[Livestreamer]> Checking if livestreamer can play", path);
        return startProcess(livestreamerPath, args);
    }
    else {
        return Promise.reject(1);
    }
};

const eventTarget = new EventTarget();

/**
 * Data indicates if the Livestreamer context menu items should be shown.
 * @event module:livestreamer#existance
 * @type {boolean}
 */
/**
 * Tries to find livestreamer and sets the exists property.
 * @fires module:livestreamer#existance
 */
let updatePath = () => {
    livestreamerPath = findLivestreamer(prefs.livestreamer_path);
    if(livestreamerPath !== "" && exists(livestreamerPath)) {
        livestreamerPathExists = true;
        showLivestreamer = !prefs.livestreamer_enabled;
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

export default {
    /**
     * Has two arguments, path and quality.
     * @event module:livestreamer#launch
     * @type {string}
     */
    /**
     * Launches the given stream with livestreamer
     * @method
     * @argument {string} path - URL to the livestream.
     * @return {Promise.<number?>} Promise with holding the final exit code.
     * @fires module:livestreamer#launch
     */
    async launch(path) {
        if(!ParentalControls.canBrowse(path))
            return 0;

        // Quality chain
        let qualities = unique([
            prefs.livestreamer_quality,
            prefs.livestreamer_fallbackQuality
        ]);
        let currentQuality, exit = 1;

        // Check if livestreamer can handle the url.
        try {
            exit = await canHandleURL(path);
        }
        catch(e) {
            return e;
        }

        // Log Livestreamer launch as an url visit, even if it fails.
        ParentalControls.log(path);

        do {
            currentQuality = qualities.shift();
            emit(eventTarget, "launch", path, currentQuality);
            try {
                exit = await launchLivestreamer(path, currentQuality);
            }
            catch(e) {
                return e;
            }
        } while(exit !== 0 && exit !== undefined && qualities.length > 0);

        return exit;
    },
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
     * @fires module:livestreamer#existance
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
