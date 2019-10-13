import React from 'react';
import PropTypes from 'prop-types';
import Tab from '../../content/components/tab.jsx';
import Tabs from '../../content/components/tab-strip.jsx';
import {
    CHANNELS_TAB,
    USERS_TAB,
    PROVIDERS_TAB,
    NOTIFICATIONS_TAB,
    ACTIONS_TAB,
    OPTIONS_TAB,
    BACKUP_TAB
} from '../constants/tabs.json';

const TABS = {
        "cm_tab_channels": CHANNELS_TAB,
        "cm_tab_users": USERS_TAB,
        "settings_tab_providers": PROVIDERS_TAB,
        "settings_tab_notifications": NOTIFICATIONS_TAB,
        "settings_tab_actions": ACTIONS_TAB,
        "settings_tab_options": OPTIONS_TAB,
        "settings_tab_backup": BACKUP_TAB
    },
    _ = browser.i18n.getMessage;

//TODO space or enter should focus tab panel.

const TabStrip = (props) => {
    const tabs = Object.entries(TABS).map(([
        title,
        id
    ]) => (<Tab title={ title } onClick={ () => props.onTabSelect(id) } key={ id }/>));
    return (
        <nav className="topbar">
            <Tabs active={ props.active } onTabSelect={ props.onTabSelect } hasFocus={ props.hasFocus }>
                { tabs }
            </Tabs>
            <ul className="toolbar inline-list right" role="toolbar">
                <li>
                    <a className="button" href="https://streamnotifier.ch/help/settings/" target="_blank" hrefLang="en" rel="noopener noreferrer help" aria-keyshortcuts="Help">{ _("cm_help") }</a>
                </li>
            </ul>
        </nav>
    );
};
TabStrip.defaultProps = {
    active: CHANNELS_TAB,
    hasFocus: false
};
TabStrip.propTypes = {
    active: PropTypes.number,
    onTabSelect: PropTypes.func.isRequired,
    hasFocus: PropTypes.bool
};

export default TabStrip;
