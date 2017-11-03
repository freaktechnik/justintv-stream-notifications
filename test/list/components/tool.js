import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Tool from '../../../src/list/components/toolbar/tool.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<Tool title="test" icon="wrench"/>);
    t.snapshot(wrapper.html());
});
