import ReadChannelList from "./read-list";

export default class ProviderChannelList extends ReadChannelList {
    constructor(type) {
        super();
        this.type = type;
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

    async liveStatus() {
        const channels = await this.getChannels();
        for(const channel of channels) {
            if(await channel.live.isLive()) {
                return true;
            }
        }
        return false;
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

    getChannelsByType() {
        return Promise.reject(new Error("Not supported"));
    }

    getUsersByType() {
        return Promise.reject(new Error("Not supported"));
    }
}
