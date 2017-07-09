/* eslint-disable new-cap */
/**
 * Wrapper for ParentalControls
 * @author Martin Giger
 * @license MPL-2.0
 * @module parental-controls
 */
import { Ci, Cm } from "chrome";
import { NetUtil } from "resource://gre/modules/NetUtil.jsm";
import { factoryByContract } from "sdk/platform/xpcom";

const registrar = Cm.QueryInterface(Ci.nsIComponentRegistrar),
    // This makes sure we always have the latest parental controls "service".
    parentalControls = {
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
                /* istanbul ignore else */
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

export default {
    /**
     * If parental controls are currently enabled.
     *
     * @type {boolean}
     * @readonly
     */
    get enabled() {
        return parentalControls.get().parentalControlsEnabled;
    },
    /**
     * If the current user is allowed to browse sites.
     *
     * @param {string} url - URI to browse.
     * @returns {boolean} If the URI may be loaded.
     */
    canBrowse(url) {
        if(!this.enabled) {
            return true;
        }
        try {
            return parentalControls.get().isAllowed(Ci.nsIParentalControlsService.BROWSE, NetUtil.newURI(url));
        }
        catch(error) {
            // Platform doesn't support this check
            return true;
        }
    },
    /**
     * Log the visit of an URI if required.
     *
     * @param {string} url - Visited URI.
     * @returns {undefined}
     */
    log(url) {
        if(this.enabled && parentalControls.get().loggingEnabled) {
            parentalControls.get().log(
                Ci.nsIParentalControlsService.ePCLog_URIVisit,
                false,
                NetUtil.newURI(url)
            );
        }
    }
};
