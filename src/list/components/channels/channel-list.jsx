import React from 'react';
import PropTypes from 'prop-types';
import NavigateableList from '../../../content/components/navigateable-list.jsx';
import Channel from './channel.jsx';
import LiveState from '../../../live-state.json';
import Extras from './extras.jsx';
import { redirectorsShape } from './redirecting.jsx';
import SORT_FIELDS from '../../constants/sort.json';
import { getFieldValue } from '../../utils.js';

const HOUR = 60;
const MS_TO_MIN = 60000;

const channelsShape = PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.oneOfType([
            PropTypes.number,
            PropTypes.string
        ]).isRequired,
        image: PropTypes.objectOf(PropTypes.string).isRequired,
        liveState: PropTypes.oneOf(Object.values(LiveState)).isRequired,
        uname: PropTypes.string.isRequired,
        title: PropTypes.string,
        type: PropTypes.string.isRequired,
        thumbnail: PropTypes.string,
        extras: PropTypes.shape(Extras.propTypes),
        redirectors: redirectorsShape,
        imageSize: PropTypes.number,
        external: PropTypes.bool,
        url: PropTypes.string.isRequired,
        tooltip: PropTypes.string.isRequired,
        language: PropTypes.string,
        showExtras: PropTypes.bool,
        showTitle: PropTypes.bool,
        showThumbnail: PropTypes.bool,
        showState: PropTypes.bool
    })),
    ChannelList = (props) => {
        let lastVal;
        const channels = [];
        for(const ch of props.channels) {
            const onClick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onChannel(ch);
                },
                onContextMenu = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    props.onContext(ch);
                };
            const fieldInfo = SORT_FIELDS[props.sortField];
            if(fieldInfo.discrete) {
                const val = getFieldValue(ch, fieldInfo.formattedPath);
                if(props.sortField === 'liveSince') {
                    const diff = Math.floor((Date.now() - val) / MS_TO_MIN);
                    const hours = Math.floor(diff / HOUR);
                    if(hours != lastVal) {
                        channels.push(<li className="subheading">{ hours }:00</li>);
                        lastVal = hours;
                    }
                }
                else if(val != lastVal) {
                    if(val) {
                        channels.push(<li className="subheading">{ val }</li>);
                    }
                    lastVal = val;
                }
            }
            channels.push( <Channel { ...ch } onClick={ onClick } onRedirectorClick={ props.onChannel } onContextMenu={ onContextMenu } onCopy={ props.onCopy } key={ ch.id }/> );
        }
        return ( <NavigateableList role="tabpanel" className="scrollable" focused={ props.focused } onFocusChange={ props.onFocusChange } hasFocus={ props.hasFocus }>
            { channels }
        </NavigateableList> );
    };
ChannelList.defaultProps = {
    hasFocus: true
};
ChannelList.propTypes = {
    channels: channelsShape.isRequired,
    focused: PropTypes.number,
    onChannel: PropTypes.func.isRequired,
    onContext: PropTypes.func.isRequired,
    onCopy: PropTypes.func.isRequired,
    onFocusChange: PropTypes.func.isRequired,
    hasFocus: PropTypes.bool,
    sortField: PropTypes.string.isRequired,
    tab: PropTypes.number.isRequired
};

export default ChannelList;
export { channelsShape };
