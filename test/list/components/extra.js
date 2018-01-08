import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Extra from '../../../src/list/components/channels/extra.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<Extra type="viewers">300</Extra>);
    t.snapshot(wrapper.html());
});
