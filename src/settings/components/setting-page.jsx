import React from 'react';
import PropTypes from 'prop-types';
import {
    CHANNELS_TAB,
    USERS_TAB,
    PROVIDERS_TAB,
    NOTIFICATIONS_TAB,
    ACTIONS_TAB,
    OPTIONS_TAB,
    BACKUP_TAB
} from '../constants/tabs.json';
import ChannelsTab from './tabs/channels.jsx';
import UsersTab from './tabs/users.jsx';
import OptionsTab from './tabs/options.jsx';

const SettingPage = (properties) => {
    let content;
    switch(properties.active) {
    case USERS_TAB:
        content = <UsersTab/>;
        break;
    case PROVIDERS_TAB:
        content = 'Providers tab';
        break;
    case NOTIFICATIONS_TAB:
        content = 'Notifications tab';
        break;
    case ACTIONS_TAB:
        content = 'Actions tab';
        break;
    case BACKUP_TAB:
        content = 'Backup tab';
        break;
    case CHANNELS_TAB:
        content = <ChannelsTab/>;
        break;
    default:
        content = <OptionsTab/>;
        break;
    }

    return (<div className="tabcontent" role="tabpanel">{ content }</div>);
};

SettingPage.defaultProps = {
    active: OPTIONS_TAB
};

SettingPage.propTypes = {
    active: PropTypes.number
};

export default SettingPage;
