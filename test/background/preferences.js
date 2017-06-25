import test from 'ava';
import prefs from '../../src/background/preferences';
import defaults from '../../src/prefs.json';
import { when } from '../../src/utils';

const SINGLE_PREF = 'copy_pattern';

test.afterEach(() => {
    browser.storage.local.get.flush();
    browser.storage.local.get.callsFake((props) => Promise.resolve(props));
});

test.serial('get single pref value', async (t) => {
    const val = 'lorem ipsum';
    const arg = { [SINGLE_PREF]: defaults[SINGLE_PREF].value };
    browser.storage.local.get.withArgs(arg).resolves({
        [SINGLE_PREF]: val
    });

    t.is(await prefs.get(SINGLE_PREF), val);
    t.deepEqual(browser.storage.local.get.lastCall.args[0], arg);
});

const testPrefDefaultValue = async (t, pref, value) => {
    t.is(await prefs.get(pref), value);
    t.deepEqual(browser.storage.local.get.lastCall.args[0], { [pref]: value });
};
testPrefDefaultValue.title = (title, pref) => `${title} for ${pref}`;

for(const pref in defaults) {
    test.serial('get single pref default value', testPrefDefaultValue, pref, defaults[pref].value);
}

test.serial('get multipe pref values', async (t) => {
    const testPrefs = {
        [SINGLE_PREF]: 'tset',
        "twitch_clientId": 'ipsum',
        "foo": 'bar'
    };
    browser.storage.local.get.resolves(testPrefs);

    const arg = {};
    for(const p in testPrefs) {
        if(p in defaults) {
            arg[p] = defaults[p].value;
        }
        else {
            arg[p] = false;
        }
    }

    t.deepEqual(await prefs.get(Object.keys(testPrefs)), Object.values(testPrefs));
    t.deepEqual(browser.storage.local.get.lastCall.args[0], arg);
});

test.serial('get multiple default values', async (t) => {
    const defaultMap = {};
    for(const p in defaults) {
        defaultMap[p] = defaults[p].value;
    }
    browser.storage.local.get.resolves(defaultMap);

    t.deepEqual(await prefs.get(Object.keys(defaults)), Object.values(defaultMap));
    t.deepEqual(browser.storage.local.get.lastCall.args[0], defaultMap);
});

//These are only not serial because they're the only ones using those global stubs.

test('set single pref value', async (t) => {
    await prefs.set('copy_pattern', 'bar');
    t.deepEqual(browser.storage.local.set.lastCall.args[0], {
        "copy_pattern": 'bar'
    });

    browser.storage.local.set.reset();
    browser.storage.local.set.resolves();
});

test('open prefs page', (t) => {
    prefs.open();

    t.true(browser.runtime.openOptionsPage.calledOnce);
    browser.runtime.openOptionsPage.reset();
});

test.serial('pref changed event', async (t) => {
    const promise = when(prefs, 'change');

    browser.storage.onChanged.dispatch({
        'foo': {
            oldValue: 'baz',
            newValue: 'bar'
        }
    }, 'local');

    const { detail: pref } = await promise;

    t.deepEqual(pref, {
        pref: 'foo',
        value: 'bar'
    });
});

test.serial('pref changed event for different area', async (t) => {
    const promise = when(prefs, 'change');

    browser.storage.onChanged.dispatch({
        foo: {
            oldValue: 'bar',
            newValue: 'baz'
        }
    }, 'sync');

    browser.storage.onChanged.dispatch({
        bar: {
            oldValue: 'foo',
            newValue: 'bar'
        }
    }, 'local');

    const { detail: pref } = await promise;
    t.deepEqual(pref, {
        pref: 'bar',
        value: 'foo'
    });
});

test.serial('reset single pref', async (t) => {
    browser.storage.local.remove.resolves();

    await prefs.reset('foo');

    t.true(browser.storage.local.remove.calledOnce);
    t.is(browser.storage.local.remove.lastCall.args[0], 'foo');

    browser.storage.local.remove.flush();
});

test.serial('reset all prefs', async (t) => {
    browser.storage.local.remove.resolves();

    await prefs.reset();

    t.true(browser.storage.local.remove.calledOnce);
    t.is(browser.storage.local.remove.lastCall.args[0], Object.keys(defaults));

    browser.storage.local.remove.flush();
});
