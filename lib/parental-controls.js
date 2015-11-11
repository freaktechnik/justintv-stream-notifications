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
     * Log the visit of an URI if required.
     * @argument {string} url - Visited URI
     */
    log(url) {
        if(ParentalControls.loggingEnabled) {
            ParentalControls.log(
                Ci.nsIParentalControlsService.ePCLog_URIVisit,
                false,
                NetUtil.newURI(url)
            );
        }
    }
};
