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
import execCommand from './exec-command';
import polyfillDataset from 'element-dataset';

// DOM environment
browserEnv([
    'window',
    'document',
    'Event',
    'CustomEvent',
    'URL',
    'HTMLElement'
]);

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
// Use the EventTarget shim, as that is loaded before the browser env in navigator.js
global.EventTarget = EventTarget;

window.indexedDB = indexedDB;

document.execCommand = execCommand;
polyfillDataset();

// WebExtension APIs
//global.chrome = chrome;

global.browser = browser;
setup();
