/**
 * A nsIAlertsService that fires SDK events
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const xpcom = require("sdk/platform/xpcom");
const { Class: newClass } = require("sdk/core/heritage");
const { CC, Ci, Cm } = require("chrome");
const { EventTarget } = require("sdk/event/target");
const { emit } = require("sdk/event/core");

const registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);
const ALERT_SERVICE_CONTRACT = "@mozilla.org/alerts-service;1";

const originalFactory = Cm.getClassObject(xpcom.factoryByContract(ALERT_SERVICE_CONTRACT), Ci.nsIFactory);
const factoryCID = registrar.contractIDToCID(ALERT_SERVICE_CONTRACT);

const oldService = xpcom.factoryByContract(ALERT_SERVICE_CONTRACT).getService(Ci.nsIAlertsService);

var lastListener;
const eventTarget = new EventTarget();

const AlertsService = newClass({
    extends: xpcom.Unknown,
    interfaces: [ "nsIAlertsService", "nsIAlertsProgressListener", "nsIAlertsDoNotDisturb" ],
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
        if(args.length > 5)
            lastListener = args[5];

        emit(eventTarget, "shownotification");
    },
    showAlert(...args) {
        if(args.length > 1)
            lastListener = args[1];

        emit(eventTarget, "shownotification");
    },
    closeAlert(...args) {
    }
});

exports.registerService = () => {
    // Unregister the current alert service and replace it with our wrapper.
    registrar.unregisterFactory(factoryCID, originalFactory);
    return xpcom.Service({
        contract: ALERT_SERVICE_CONTRACT,
        Component: AlertsService,
        unregister: false,
        id: factoryCID
    });
};

exports.unregisterService = (wrapperFactory) => {
    xpcom.unregister(wrapperFactory);
    registrar.registerFactory(
        factoryCID,
        "Alerts Service",
        ALERT_SERVICE_CONTRACT,
        originalFactory
    );
};

exports.getLastListener = () => lastListener;
exports.getEventTarget = () => eventTarget;
