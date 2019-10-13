import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import NavigateableItem from '../../../src/content/components/navigateable-item.jsx';
import NavigateableList from '../../../src/content/components/navigateable-list.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<NavigateableList onFocusChange={ () => t.fail() }>
        <NavigateableItem>Foo</NavigateableItem>
    </NavigateableList>);
    t.snapshot(wrapper.html());
});
