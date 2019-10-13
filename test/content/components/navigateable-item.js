import React from 'react';
import test from 'ava';
import { shallow } from 'enzyme';
import NavigateableItem from '../../../src/content/components/navigateable-item.jsx';

test('snapshot', (t) => {
    const wrapper = shallow(<NavigateableItem onFocusChange={ () => t.fail() } focused={ false } onFocus={ () => t.fail() }>
        <div>Foo</div>
    </NavigateableItem>);
    t.snapshot(wrapper.html());
});
