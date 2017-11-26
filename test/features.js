import test from 'ava';
import * as features from '../src/features';

test.serial('hasStreamlink', async (t) => {
    browser.management.get.rejects();
    browser.management.get.withArgs('streamlink.firefox.helper@gmail.com').resolves({});

    const hasStreamlink = await features.hasStreamlink();

    t.true(hasStreamlink);

    browser.management.get.reset();
});

test.serial('not hasStreamlink', async (t) => {
    browser.management.get.rejects();

    const hasStreamlink = await features.hasStreamlink();

    t.false(hasStreamlink);

    browser.management.get.reset();
});

test.serial('not isAndroid', async (t) => {
    browser.runtime.getPlatformInfo.resolves({
        os: 'linux'
    });

    const isAndroid = await features.isAndroid();

    t.false(isAndroid);

    browser.runtime.getPlatformInfo.reset();
});

test.serial('rejects isAndroid', async (t) => {
    browser.runtime.getPlatformInfo.rejects();

    const isAndroid = await features.isAndroid();

    t.false(isAndroid);

    browser.runtime.getPlatformInfo.reset();
});

test.serial('isAndroid', async (t) => {
    browser.runtime.getPlatformInfo.resolves({
        os: 'android'
    });

    const isAndroid = await features.isAndroid();

    t.true(isAndroid);

    browser.runtime.getPlatformInfo.reset();
});
