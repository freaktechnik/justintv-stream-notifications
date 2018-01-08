import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Since from '../../../src/list/components/channels/since.jsx';
import sinon from 'sinon';

const INTERVAL = 120000;

let clock;
test.before(() => {
    clock = sinon.useFakeTimers();
});

test.after(() => {
    clock.restore();
});

test('snapshot', (t) => {
    const ts = Date.now() - INTERVAL;
    const wrapper = shallow(<Since>{ ts }</Since>);
    t.snapshot(wrapper.html());
});

test('update', (t) => {
    const ts = Date.now() - INTERVAL;
    const wrapper = shallow(<Since>{ ts }</Since>);

    const prev = wrapper.html();

    clock.tick(INTERVAL);
    wrapper.update();

    const updated = wrapper.html();
    t.snapshot(updated);
    t.not(updated, prev);
});
