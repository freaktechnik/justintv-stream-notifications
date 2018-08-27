import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Icon from '../../../src/list/components/icon.jsx';
import openIconic from '../../helpers/assets/open-iconic';

test('has icon class', (t) => {
    const wrapper = shallow(
        <Icon type="test"/>
    );
    t.true(wrapper.is('.icon'));
});

test('contains svg', (t) => {
    const wrapper = shallow(
        <Icon type="test"/>
    );
    t.true(wrapper.find('svg').exists());
});

test('snapshot', (t) => {
    const wrapper = shallow(<Icon type="test"/>);
    t.snapshot(wrapper.html());
});

test('type', (t) => {
    const type = "test";
    const wrapper = shallow(<Icon type={ type }/>);
    const use = wrapper.find('use');
    t.true(use.exists());
    t.is(use.prop('xlinkHref'), `${openIconic}#${type}`);
});
