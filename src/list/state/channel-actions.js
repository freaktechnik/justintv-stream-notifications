import storeTypes from '../constants/store-types.json';

export const CHANNEL_ACTIONS = {
    OPEN: 0,
    ARCHIVE: 1,
    CHAT: 2,
    CONTEXT: 3,
    COPY: 4,
    LIVESTREAMER: 5
};

const ACTION_MAP = [
    {
        internal: 'open',
        external: 'open',
        internalProp: 'id',
        externalProp: 'url'
    },
    {
        internal: 'openArchive',
        external: 'open',
        internalProp: 'id',
        externalProp: 'url'
    },
    {
        internal: 'openChat',
        external: 'open',
        internalProp: 'id',
        externalProp: 'chatUrl'
    },
    {
        internal: storeTypes.SET_CONTEXT_CHANNEL,
        external: storeTypes.SET_CONTEXT_CHANNEL,
        internalProp: '',
        externalProp: ''
    },
    {
        internal: storeTypes.COPY,
        external: storeTypes.COPY,
        internalProp: '',
        externalProp: ''
    },
    {
        internal: 'openLivestreamer',
        external: 'openLivestreamer',
        internalProp: 'id',
        externalProp: 'url'
    }
];
const STATE_TYPES = Array.from(Object.values(storeTypes));

const getMessageInfo = (action, channel) => {
    const spec = ACTION_MAP[parseInt(action, 10)];
    let type, payload;
    if(channel.external) {
        type = spec.external;
        payload = spec.externalProp;
    }
    else {
        type = spec.internal;
        payload = spec.internalProp;
    }
    return {
        type,
        payload
    };
};

export const getChannelAction = (action, channel) => {
    const message = {};
    const {
        type,
        payload
    } = getMessageInfo(action, channel);
    if(STATE_TYPES.includes(type)) {
        message.type = type;
    }
    else {
        message.command = type;
    }

    if(payload.length) {
        message.payload = channel[payload];
    }
    else {
        message.payload = channel;
    }
    return message;
};

export const shouldClose = (action, channel) => {
    const { type } = getMessageInfo(action, channel);
    return !STATE_TYPES.includes(type);
};
