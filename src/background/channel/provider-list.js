import ReadChannelList from "./read-list";

export default class ProviderChannelList extends ReadChannelList {
    constructor(type) {
        super();
        this.type = type;
    }

    filterEvents(event, payload) {
        if(event === "channelsadded") {
            return payload.some((c) => c.type === this.type);
        }
        else if(event === "useradded" || event === "userupdated" || event === "channelupdated" || event === "beforechanneldeleted" || event === "userdeleted") {
            return payload.type === this.type;
        }
        return true;
    }

    getChannelId(name) {
        return super.getChannelId(name, this.type);
    }

    getUserId(name) {
        return super.getUserId(name, this.type);
    }

    async getChannel(id) {
        const channel = await super.getChannel(id);
        if(channel.type === this.type) {
            return channel;
        }
        else {
            throw new Error("No result for the given ID");
        }
    }

    getChannelByName(name) {
        return super.getChannel(name, this.type);
    }

    async getUser(id) {
        const user = await super.getUser(id);
        if(user.type === this.type) {
            return user;
        }
        else {
            throw new Error("Could not fetch specified user");
        }
    }

    getUserByName(name) {
        return super.getUser(name, this.type);
    }

    channelExists(name) {
        return this.getChannelByName(name).then((c) => !!c, () => false);
    }

    userExists(name) {
        return this.getUserByName(name).then((u) => !!u, () => false);
    }

    liveStatus() {
        return super.liveStatus(this.type);
    }

    getChannels() {
        return super.getChannelsByType(this.type);
    }

    getUsers() {
        return super.getUsersByType(this.type);
    }

    getUsersByFavorite(channel) {
        if(channel.type === this.type) {
            return super.getUsersByFavorite(channel);
        }
        else {
            return Promise.reject(new Error("Type does not match"));
        }
    }

    getChannelsByUserFavorites(user) {
        if(user.type === this.type) {
            return super.getChannelsByUserFavorites(user);
        }
        else {
            return Promise.reject(new Error("Type does not match"));
        }
    }

    getChannelsByType(type) {
        if(type === this.type) {
            return this.getChannels();
        }
        return Promise.reject(new Error("Not supported"));
    }

    getUsersByType(type) {
        if(type == this.type) {
            return this.getUsers();
        }
        return Promise.reject(new Error("Not supported"));
    }
}
