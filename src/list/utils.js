import LiveState from '../live-state.json';

const FIRST_URL = 0,
    OFFLINE_TYPE = 2,
    SMALL_IMAGE = 12,
    LARGE_IMAGE = 30;

export { SMALL_IMAGE, LARGE_IMAGE };

export const getExternalID = (channel) => `${channel.login}|${channel.type}`;

export const formatChannel = (channel, providers, type, extras = false, style = "default", showThumbnails = true) => {
    const formattedChannel = {
        uname: channel.uname,
        type: channel.type,
        image: channel.image,
        liveState: channel.live.state,
        imageSize: LARGE_IMAGE,
        hasChat: false,
        providerEnabled: providers[channel.type].enabled,
        tooltip: channel.uname,
        url: channel.url[FIRST_URL]
    };
    if(style === "compact") {
        formattedChannel.imageSize = SMALL_IMAGE;
    }
    if(extras) {
        formattedChannel.extras = {
            category: channel.category,
            viewers: channel.viewers,
            provider: providers[channel.type].name
        };
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== OFFLINE_TYPE && style !== "compact") {
        if(style === "thumbnail" && (!channel.mature || showThumbnails)) {
            formattedChannel.thumbnail = channel.thumbnail;
        }
        formattedChannel.title = channel.title;
    }
    else if(formattedChannel.extras && type === OFFLINE_TYPE) {
        delete formattedChannel.extras.viewers;
        delete formattedChannel.extras.category;
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== OFFLINE_TYPE && channel.title) {
        formattedChannel.tooltip += ` - "${channel.title}"`;
    }

    if("id" in channel) {
        formattedChannel.id = channel.id;
        formattedChannel.external = false;
    }
    else {
        formattedChannel.external = true;
        formattedChannel.id = getExternalID(channel);
        formattedChannel.chatUrl = channel.chatUrl;
    }
    if(channel.redirectors) {
        formattedChannel.redirectors = channel.redirectors.map((ch) => ({
            uname: ch.uname,
            image: ch.image,
            id: ch.id
        }));
        delete channel.redirectors;
    }
    if(channel.chatUrl) {
        formattedChannel.hasChat = true;
    }
    return formattedChannel;
};
