/**
 * Start a new process
 * @author Martin Giger
 * @license MPL-2.0
 * @module livestreamer/process
 */

import { CC } from "chrome";
import { exists } from "sdk/io/file";
import { Unknown } from "sdk/platform/xpcom";

const Process = CC("@mozilla.org/process/util;1", "nsIProcess", "init");
const File = CC("@mozilla.org/file/local;1", "nsILocalFile", "initWithPath");

const PROCESS_FINISHED = "process-finished";
const PROCESS_FAILED = "process-failed";

class Observer extends Unknown {
    interfaces: [ "nsIObserver" ],
    constructor(resolve, reject) {
        super();
        this.resolve = resolve;
        this.reject = reject;
    }
    observe(subject, topic, data) {
        /* istanbul ignore else */
        if(topic === PROCESS_FINISHED &&
           (subject.exitValue === 0 || subject.exitValue === undefined)) {
            this.resolve(subject.exitValue);
        }
        else if(topic === PROCESS_FAILED || topic === PROCESS_FINISHED) {
            this.reject(subject.exitValue || 1);
        }
        else {
            console.warn("Unhandled process observer topic", topic);
        }
    }
}

/**
 * Start a process
 * @argument {string} path - Absolute path to the executable to run
 * @argument {Array.<string>} [args = []] - An array of arguments to pass
 * @return {Promise.<number>} A promise resolving to the exit code of the
 *                            process. Rejects if the value is non-null.
 * @throws {string} If the given path does not exist
 */
export const startProcess = (path, args = []) => {
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
