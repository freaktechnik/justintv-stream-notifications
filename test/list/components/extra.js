import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Extra from '../../../src/list/components/extra.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<Extra type="viewers" value="300"/>);
    t.snapshot(wrapper.html());
});
