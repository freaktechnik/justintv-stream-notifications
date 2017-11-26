import test from 'ava';
import * as navigateableKeys from '../../../src/list/constants/navigateable';

test('keys only occur in one constant', (t) => {
    const keys = new Set();
    for(const name of Object.keys(navigateableKeys)) {
        for(const key of navigateableKeys[name]) { // eslint-disable-line import/namespace
            t.false(keys.has(key));
            keys.add(key);
        }
    }
});

test('all keys are string', (t) => {
    for(const name of Object.keys(navigateableKeys)) {
        for(const key of navigateableKeys[name]) { // eslint-disable-line import/namespace
            t.is(typeof key, "string");
        }
    }
});
