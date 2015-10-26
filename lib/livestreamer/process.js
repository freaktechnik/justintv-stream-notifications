/**
 * Start a new process
 * @author Martin Giger
 * @license MPL-2.0
 * @module lib/livestreamer/process.js
 */

const { CC } = require("chrome");
const { exists } = require("sdk/io/file");

const Process = CC("@mozilla.org/process/util;1", "nsIProcess", "init");
const File = CC("@mozilla.org/file/local;1", "nsILocalFile", "initWithPath");

exports.startProcess = function(path, args) {
    if(exists(path)) {
        let file = new File(path);
        let process = new Process(file);
        process.runAsync(args);
    }
    else {
        throw "File doesn't exist";
    }
};
