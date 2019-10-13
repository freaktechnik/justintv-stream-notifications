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

const SettingPage = (props) => {
    let pageContent;
    switch(props.active) {
    case USERS_TAB:
        pageContent = 'Users tab';
        break;
    case PROVIDERS_TAB:
        pageContent = 'Providers tab';
        break;
    case NOTIFICATIONS_TAB:
        pageContent = 'Notifications tab';
        break;
    case ACTIONS_TAB:
        pageContent = 'Actions tab';
        break;
    case OPTIONS_TAB:
        pageContent = 'Options tab';
        break;
    case BACKUP_TAB:
        pageContent = 'Backup tab';
        break;
    case CHANNELS_TAB:
    default:
        pageContent = 'Here be settings';
    }

    return (<div className="tabcontent" role="tabpanel">{ pageContent }</div>);
};

SettingPage.propTypes = {
    active: PropTypes.number
};

export default SettingPage;
