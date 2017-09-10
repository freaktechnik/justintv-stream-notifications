import LiveState from '../live-state.json';

export const getExternalID = (channel) => {
    return channel.login + "|" + channel.type;
};

export const formatChannel = (channel, providers, type, extras = false, style = "default") => {
    const formattedChannel = {
        uname: channel.uname,
        type: channel.type,
        image: channel.image,
        liveState: channel.live.state,
        imageSize: 30,
        hasChat: false,
        providerEnabled: providers[channel.type].enabled,
        tooltip: channel.uname
    };
    if(style === "compact") {
        formattedChannel.imageSize = 12;
    }
    if(extras) {
        formattedChannel.extras = {
            category: channel.category,
            viewers: channel.viewers,
            provider: providers[channel.type].name
        };
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== 2 && style !== "compact") {
        if(style === "thumbnail") {
            formattedChannel.thumbnail = channel.thumbnail;
        }
        formattedChannel.title = channel.title;
    }
    else if(formattedChannel.extras && type === 2) {
        delete formattedChannel.extras.viewers;
        delete formattedChannel.extras.category;
    }
    if(channel.live.state !== LiveState.OFFLINE && type !== 2 && channel.title) {
        formattedChannel.tooltip += ` - "${channel.title}"`;
    }

    if("id" in channel) {
        formattedChannel.id = channel.id;
        formattedChannel.external = false;
    }
    else {
        formattedChannel.external = true;
        formattedChannel.id = getExternalID(channel);
        formattedChannel.url = channel.url[0];
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
