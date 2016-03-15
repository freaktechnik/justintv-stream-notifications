#! /bin/env nodejs
/**
 * Pretends to be livestreamer when run with node.
 * Implements all arguemnts used in the jtvn extension.
 */
"use strict";

console.log("Simulating Livestreamer...");

if(process.argv[2].indexOf("--can-handle-url") != -1)
    process.exit(0);

process.exit(1);
