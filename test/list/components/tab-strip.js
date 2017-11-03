import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import TabStrip from '../../../src/list/components/toolbar/tab-strip.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<TabStrip onTabSelect={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});

test('snapshot with nonlive', (t) => {
    const wrapper = shallow(<TabStrip showNonlive={ true } onTabSelect={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});

test('snapshot select offline', (t) => {
    const wrapper = shallow(<TabStrip active={ 2 } onTabSelect={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});
