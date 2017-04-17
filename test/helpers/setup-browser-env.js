import browserEnv from 'browser-env';
//import chrome from 'sinon-chrome/extensions';
import browser from 'sinon-chrome/webextensions';
import sinon from 'sinon';
import { URLSearchParams } from 'url';
import { setup } from './default-behavior';
import indexedDB from 'fake-indexeddb';
import IDBKeyRange from 'fake-indexeddb/lib/FDBKeyRange';
import Headers from 'fetch-headers';
import Navigator from './navigator';
import EventTarget from 'event-target-shim';
import getPort from './port';

// DOM environment
browserEnv([ 'window', 'document', 'Event', 'CustomEvent', 'URL' ]);

// Additional Web APIs
global.fetch = sinon.stub();
fetch.resolves({
    ok: true,
    status: 200,
    clone() {
        return this;
    },
    json() {
        return Promise.resolve({});
    },
    text() {
        return Promise.resolve("{}");
    }
});
global.URLSearchParams = URLSearchParams;
global.indexedDB = indexedDB;
global.IDBKeyRange = IDBKeyRange;
global.Headers = Headers;
global.navigator = new Navigator();
// Use the EventTarget shim, as that is loaded bevore the browser env in navigator.js
global.EventTarget = EventTarget;

window.indexedDB = indexedDB;

// WebExtension APIs
//global.chrome = chrome;

// Gets called by src/backbround/sdk.js
global.SDKStubs = getPort();
global.SDKStubs.name = "sdk-connection";
global.browser = browser;
setup();
