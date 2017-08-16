import React from 'react';
import TabStrip from './tabstrip.jsx';
import Channels from './channels.jsx';
import Context from './context.jsx';

export default () => (
    <main className="tabbed">
        <TabStrip/>
        <Channels/>
        <Context/>
    </main>
);
