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
const envVars = require("./env.json");

let launch = function(path) {
    let args = [ path, prefs.livestreamer_quality ];
    if(prefs.livestreamer_player)
        args.push("-p\ "+prefs.livestreamer_player);

    let env = {};

    envVars.forEach((name) => {
        if(system.env[name])
            env[name] = system.env[name];
    });

    console.log("[Livestreamer]> Spawning", prefs.livestreamer_path + " " + args.join(" "));
    let livestreamer = childProcess.spawn(prefs.livestreamer_path, args, {
        env: env,
        cwd: system.pathFor("CurProcD")
    });
    livestreamer.stdout.on("data", (s) => console.log("[Livestreamer]>",s));
    livestreamer.stderr.on("data", (s) => console.error("[Livestreamer]>",s));
    livestreamer.on("close", (exitCode, signalCode) => console.log("[Livestreamer]> closed with", exitCode, signalCode));
};

exports.launch = launch;
