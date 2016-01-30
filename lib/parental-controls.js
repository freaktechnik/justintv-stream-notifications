/**
 * Wrapper for ParentalControls
 * @author Martin Giger
 * @license MPL-2.0
 * @module parental-controls
 */
"use strict";

const { CC, Ci } = require("chrome");
const { NetUtil } = require("resource://gre/modules/NetUtil.jsm");

const ParentalControls = CC("@mozilla.org/parental-controls-service;1", "nsIParentalControlsService");

module.exports = {
    /**
     * If parental controls are currently enabled.
     * @type {boolean}
     * @readonly
     */
    get enabled() {
        return ParentalControls.parentalControlsEnabled;
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
            return ParentalControls.isAllowed(Ci.nsIParentalControlsService.BROWSE, NetUtil.newURI(url));
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
        if(this.enabled && ParentalControls.loggingEnabled) {
            ParentalControls.log(
                Ci.nsIParentalControlsService.ePCLog_URIVisit,
                false,
                NetUtil.newURI(url)
            );
        }
    }
};
