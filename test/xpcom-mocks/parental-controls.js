/**
 * A nsIParentalControlsService that akes it easy to test it
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const helper = require("./helper");
const { Ci } = require("chrome");

const PC_log = [];
let enabled = true;

const [ registerService, unregisterService ] = helper.createMock("@mozilla.org/parental-controls-service;1", ["nsIParentalControlsService"], () => ({
    get parentalControlsEnabled() {
        return enabled;
    },
    isAllowed(action, uri) {
        if(!enabled || uri.host == "humanoids.be")
            throw "Checking if something is allowed when disabled";

        return false;
    },
    get loggingEnabled() {
        return enabled;
    },
    log(type, notRelevant, uri) {
        if(!enabled)
            throw "Logging when not enabled";
        console.log("will log:",type == Ci.nsIParentalControlsService.ePCLog_URIVisit);
        if(type == Ci.nsIParentalControlsService.ePCLog_URIVisit)
            PC_log.push(uri);
    }
}));

exports.registerService = registerService;
exports.unregisterService = unregisterService;

exports.getLogs = () => PC_log;
exports.setEnabled = (val) => {
    enabled = val;
};
