/**
 * Start a new process
 * @author Martin Giger
 * @license MPL-2.0
 * @module livestreamer/process
 */

const { CC } = require("chrome");
const { exists } = require("sdk/io/file");
const { Class: newClass } = require("sdk/core/heritage");
const { Unknown } = require("sdk/platform/xpcom");

const Process = CC("@mozilla.org/process/util;1", "nsIProcess", "init");
const File = CC("@mozilla.org/file/local;1", "nsILocalFile", "initWithPath");

const PROCESS_FINISHED = "process-finished";
const PROCESS_FAILED = "process-failed";

const Observer = newClass({
    extends: Unknown,
    interfaces: [ "nsIObserver" ],
    initialize: function(resolve, reject) {
        this.resolve = resolve;
        this.reject = reject;
    },
    observe: function(subject, topic, data) {
        if(topic === PROCESS_FINISHED && subject.exitValue === 0) {
            this.resolve(subject.exitValue);
        }
        else if(topic === PROCESS_FAILED ||
                (topic === PROCESS_FINISHED && subject.exitValue !== 0)) {
            var value = subject.exitValue;
            if(!subject.exitValue)
                value = 1;
            this.reject(value);
        }
        else {
            console.log("Unhandled process observer topic", topic);
        }
    }
});

/**
 * Start a process
 * @argument {string} path - Absolute path to the executable to run
 * @argument {Array.<string>} [args = []] - An array of arguments to pass
 * @return {Promise.<number>} A promise resolving to the exit code of the
 *                            process. Rejects if the value is non-null.
 * @throws {string} If the given path does not exist
 */
exports.startProcess = function(path, args = []) {
    if(exists(path)) {
        let file = new File(path);
        let process = new Process(file);
        return new Promise((resolve, reject) => {
            process.runAsync(args, args.length, new Observer(resolve, reject), false);
        });
    }
    else {
        throw "File doesn't exist";
    }
};
