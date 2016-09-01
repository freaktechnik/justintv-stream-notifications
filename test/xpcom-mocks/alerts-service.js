/* eslint-disable new-cap */
/**
 * A nsIAlertsService that fires SDK events.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const helper = require("./helper"),
    { EventTarget } = require("sdk/event/target"),
    { emit } = require("sdk/event/core"),
    { Ci } = require("chrome"),
    eventTarget = new EventTarget();

let lastListener;

const [ registerService, unregisterService ] = helper.createMock("@mozilla.org/alerts-service;1", [ "nsIAlertsService", "nsIAlertsProgressListener", "nsIAlertsDoNotDisturb" ], (oldService) => ({
    onProgress(...args) {
        oldService.QueryInterface(Ci.nsIAlertsProgressListener).onProgress(...args);
    },
    onCancel(...args) {
        oldService.QueryInterface(Ci.nsIAlertsProgressListener).onCancel(...args);
    },
    get manualDoNotDisturb() {
        return oldService.QueryInterface(Ci.nsIAlertsDoNotDisturb).manualDoNotDisturb;
    },
    set manualDoNotDisturb(val) {
        oldService.QueryInterface(Ci.nsIAlertsDoNotDisturb).manualDoNotDisturb = val;
    },
    showAlertNotification(...args) {
        if(args.length > 5) {
            lastListener = args[5];
        }

        emit(eventTarget, "shownotification");
    },
    showAlert(...args) {
        if(args.length > 1) {
            lastListener = args[1];
        }

        emit(eventTarget, "shownotification");
    },
    closeAlert() {
        throw "Shouldn't call closeAlert()";
    }
}), helper.TYPE_SERVICE);

exports.registerService = registerService;
exports.unregisterService = unregisterService;

exports.getLastListener = () => lastListener;
exports.getEventTarget = () => eventTarget;
