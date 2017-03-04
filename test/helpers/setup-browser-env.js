import browserEnv from 'browser-env';
//import chrome from 'sinon-chrome/extensions';
import browser from 'sinon-chrome/webextensions';
import sinon from 'sinon';
import ChromeEvent from 'sinon-chrome/events';
import { URLSearchParams } from 'url';
import { setup } from './default-behavior';

// DOM environment
browserEnv([ 'window', 'document', 'navigator', 'EventTarget', 'Event', 'CustomEvent', 'URL' ]);

// Additional Web APIs
global.fetch = sinon.stub();
global.URLSearchParams = URLSearchParams;

// WebExtension APIs
//global.chrome = chrome;

// Gets called by src/backbround/sdk.js
global.SDKStubs = {
    onMessage: new ChromeEvent(),
    postMessage: sinon.stub()
};
global.browser = browser;
setup();
