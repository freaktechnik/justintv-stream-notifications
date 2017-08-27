import React from 'react';
import TabStrip from './tabstrip.jsx';
import Channels from './channels.jsx';
//import Context from './context.jsx';

const Popup = () => {
    let contextMenu;
    /*if(false) {
        contextMenu = <Context/>;
    }*/
    return ( <main className="tabbed">
        <TabStrip/>
        <Channels/>
        { contextMenu }
    </main> );
};

export default Popup;
