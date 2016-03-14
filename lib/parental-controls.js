/**
 * Wrapper for ParentalControls
 * @author Martin Giger
 * @license MPL-2.0
 * @module parental-controls
 */
"use strict";

const { Ci, Cm } = require("chrome");
const { NetUtil } = require("resource://gre/modules/NetUtil.jsm");
const { factoryByContract } = require("sdk/platform/xpcom");
const registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar);

// This makes sure we always have the latest parental controls "service".
const ParentalControls = {
    _instance: null,
    contractID: "@mozilla.org/parental-controls-service;1",
    _CID: null,
    get() {
        try {
            const currentCID = registrar.contractIDToCID(this.contractID);
            if(this._instance === null || !currentCID.equals(this._CID)) {
                this._CID = currentCID;
                this._instance = factoryByContract(this.contractID).createInstance(Ci.nsIParentalControlsService);
            }
        }
        catch(e) {
            // component isn't registered (like for example in waterfox :S)
            if(this._instance === null || this._CID !== null) {
                this._instance = {
                    parentalControlsEnabled: false
                };
                this._CID = null;
            }
        }
        return this._instance;
    }
};

module.exports = {
    /**
     * If parental controls are currently enabled.
     * @type {boolean}
     * @readonly
     */
    get enabled() {
        return ParentalControls.get().parentalControlsEnabled;
    },
    /**
     * If the current user is allowed to browse sites.
     * @argument {string} url - URI to browse
     * @return {boolean}
     */
    canBrowse(url) {
        if(!this.enabled)
            return true;
        try {
            return ParentalControls.get().isAllowed(Ci.nsIParentalControlsService.BROWSE, NetUtil.newURI(url));
        } catch(error) {
            // Platform doesn't support this check
            return true;
        }
    },
    /**
     * Log the visit of an URI if required.
     * @argument {string} url - Visited URI
     */
    log(url) {
        if(this.enabled && ParentalControls.get().loggingEnabled) {
            ParentalControls.get().log(
                Ci.nsIParentalControlsService.ePCLog_URIVisit,
                false,
                NetUtil.newURI(url)
            );
        }
    }
};
