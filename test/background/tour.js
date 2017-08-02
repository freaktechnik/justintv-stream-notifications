import test from 'ava';
import Tour from '../../src/background/tour';

const BASE_URL = "http://streamnotifier.ch/";

test.serial.afterEach.always(() => {
    browser.tabs.create.resetHistory();
});

test('enabled', async (t) => {
    t.true(await Tour.enabled());
});

test.serial('onInstalled', async (t) => {
    await Tour.onInstalled();

    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, `${BASE_URL}firstrun/`);
});

test.serial('onUpdate main channel', async (t) => {
    const version = "1.0.0";
    browser.runtime.getManifest.returns({ version });

    await Tour.onUpdate();

    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, `${BASE_URL}changes/${version}/`);
});

test.serial('onUpdate beta channel', async (t) => {
    const version = "1.0.0pre1";
    browser.runtime.getManifest.returns({ version });

    await Tour.onUpdate();

    t.true(browser.tabs.create.calledOnce);
    t.is(browser.tabs.create.lastCall.args[0].url, `https://addons.mozilla.org/firefox/addon/justintv-stream-notificatio/versions/beta#version-${version}`);
});
