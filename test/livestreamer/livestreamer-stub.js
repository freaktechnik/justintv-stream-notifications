#! /bin/env nodejs
/**
 * Pretends to be livestreamer when run with node.
 * Implements all arguemnts used in the jtvn extension.
 */
"use strict";

if(process.argv[2].includes("--can-handle-url"))
    process.exit(0);

process.exit(1);
