import test from 'ava';
import storeTypes from '../../../src/list/constants/store-types.json';

const testType = (t, key) => {
    t.is(typeof storeTypes[key], "string");
};
testType.title = (title, key) => `${title}: ${key}`;

for(const key in storeTypes) {
    test('type', testType, key);
}
