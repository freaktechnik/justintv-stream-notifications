import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Tools from '../../../src/list/components/toolbar/tools.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<Tools onToolClick={ () => t.fail() } onRefreshContextMenu={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});
