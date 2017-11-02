import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import Tab from '../../../src/list/components/tab.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<Tab title="test" onFocusChange={ () => t.fail() }/>);
    t.snapshot(wrapper.html());
});
