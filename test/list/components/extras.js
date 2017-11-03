import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Extras from '../../../src/list/components/channels/extras.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<Extras provider="test"/>);
    t.snapshot(wrapper.html());
});

test('snapshot with all extras', (t) => {
    const wrapper = shallow(<Extras provider="test" viewers={ 299 } category="lorem ipsum"/>);
    t.snapshot(wrapper.html());
});
