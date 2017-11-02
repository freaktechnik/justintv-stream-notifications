import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import ContextItem from '../../../src/list/components/context-item.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<ContextItem label="test" onFocusChange={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});
