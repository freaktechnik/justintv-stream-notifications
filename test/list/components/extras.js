import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Extras from '../../../src/list/components/channels/extras.jsx';
import { useFakeTimers } from 'sinon';
import LiveState from '../../../src/live-state.json';

let clock;
test.before(() => {
    clock = useFakeTimers();
});
test.after(() => {
    clock.restore();
});

const MINUTE = 60000;

test('snapshot', (t) => {
    const wrapper = shallow(<Extras provider="test"/>);
    t.snapshot(wrapper.html());
});

test('snapshot with all extras', (t) => {
    const liveSince = Date.now() - MINUTE;
    const wrapper = shallow(<Extras provider="test" viewers={ 299 } category="lorem ipsum" liveSince={ liveSince }/>);
    t.snapshot(wrapper.html());
});

test('snapshot with liveState offline', (t) => {
    const wrapper = shallow(<Extras provider="test" liveState={ LiveState.OFFLINE }/>);
    t.snapshot(wrapper.html());
});

test('snapshot with liveState live', (t) => {
    const wrapper = shallow(<Extras provider="test" liveState={ LiveState.LIVE }/>);
    t.snapshot(wrapper.html());
});

test('snapshot with liveState rebroadcast', (t) => {
    const wrapper = shallow(<Extras provider="test" liveState={ LiveState.REBROADCAST }/>);
    t.snapshot(wrapper.html());
});
