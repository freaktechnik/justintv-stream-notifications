/*
 * Created by Martin Giger
 * Licensed under MPL 2.0
 *
 *
 * Launch stream with livestreamer
 * Currently doesn't work, player gets immediately closed. (can't even be opened?)
 */

"use strict";

let childProcess = require("sdk/system/child_process");
let { prefs } = require("sdk/simple-prefs");
let system = require("sdk/system");
const ENV_VARS = require("./env.json");
const DEFAULT_PATHS = {
    "winnt": "C:\\Prgoram Files (x86)\\Livestreamer\\livestreamer.exe",
    "linux": "/usr/local/bin/livestreamer",
    "darwin": "/Applications/livestreamer.app"
};

let launch = function(path) {
    let args = [ path, prefs.livestreamer_quality ];
    if(prefs.livestreamer_player)
        args.push("-p\ "+prefs.livestreamer_player);

    let env = {};

    ENV_VARS.forEach((name) => {
        if(system.env[name])
            env[name] = system.env[name];
    });

    let livestreamerPath = prefs.livestreamer_path || DEFAULT_PATHS[system.platform];

    console.log("[Livestreamer]> Spawning", livestreamerPath + " " + args.join(" "));
    let livestreamer = childProcess.spawn(livestreamerPath, args, {
        env: env,
        cwd: system.pathFor("CurProcD")
    });
    livestreamer.stdout.on("data", (s) => console.log("[Livestreamer]>",s));
    livestreamer.stderr.on("data", (s) => console.error("[Livestreamer]>",s));
    livestreamer.on("close", (exitCode, signalCode) => console.log("[Livestreamer]> closed with", exitCode, signalCode));
};

exports.launch = launch;
