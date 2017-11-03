import test from 'ava';
import tabs from '../../../src/list/constants/tabs.json';

test('constants', (t) => {
    t.true("LIVE_TAB" in tabs);
    t.true("NONLIVE_TAB" in tabs);
    t.true("OFFLINE_TAB" in tabs);
    t.true("EXPLORE_TAB" in tabs);
});

test('all numbers', (t) => {
    const values = Array.from(Object.values(tabs));
    for(let i = 0; i < values.length; ++i) {
        t.true(values.includes(i));
    }
});
