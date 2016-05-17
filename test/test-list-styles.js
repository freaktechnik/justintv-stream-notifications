/**
 * @author Martin Giger
 * @license MPL-2.0
 */
"use strict";

const requireHelper = require("./require_helper");
const providers = requireHelper("../lib/providers");
const { XMLHttpRequest } = require("sdk/net/xhr");
const self = require("sdk/self");
const { wait } = require("./event/helpers");

exports.testProviderStyles = function*(assert) {
    const xhr = new XMLHttpRequest();
    const p = wait(xhr, "load");
    xhr.open("GET", self.data.url("list.css"));
    xhr.overrideMimeType("text/css");
    xhr.send();
    yield p;

    for(let provider in providers) {
        assert.ok(xhr.responseText.includes("."+provider+" a"), "Color definitions for "+provider+" exist");
    }
};

require("sdk/test").run(exports);
