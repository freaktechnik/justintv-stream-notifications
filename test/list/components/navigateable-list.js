import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import NavigateableItem from '../../../src/list/components/navigateable-item.jsx';
import NavigateableList from '../../../src/list/components/navigateable-list.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<NavigateableList>
        <NavigateableItem onFocusChange={ () => t.fail() }>Foo</NavigateableItem>
    </NavigateableList>);
    t.snapshot(wrapper.html());
});
