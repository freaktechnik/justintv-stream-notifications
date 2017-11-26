/**
 * Channel list Object.
 *
 * @author Martin Giger
 * @license MPL-2.0
 * @module database-manager
 */
import { emit } from "./utils";

/**
 * The ChannelList is ready to be used.
 *
 * @event module:read-channel-list.ReadChannelList#ready
 */
/**
 * The ChannelList's DB connection was closed.
 *
 * @event module:read-channel-list.ReadChannelList#close
 */

export class FixListError extends Error {
    constructor() {
        super("Could not open list, please fix");
    }
}

export class CantOpenListError extends Error {
    constructor() {
        super("Can not open list due to security settings");
    }
}

export class ListClosedError extends Error {
    constructor() {
        super("List is not open at the moment");
    }
}

/**
 * IndexedDB version.
 *
 * @const {number}
 * @default 3
 */
const VERSION = 3,
    /**
     * Database name.
     *
     * @const {string}
     * @default "channellist"
     */
    NAME = "channellist",
    OBJECT_STORES = {
        users: 'users',
        channels: 'channels'
    },
    DatabaseManager = {
        db: null,
        loading: null,
        lists: new Set(),
        name: NAME,
        error: null,
        idCache: new Map(),
        /**
         * Handle indexedDB requests as promise.
         *
         * @private
         * @async
         * @param {external:IDBRequest} request - Request to wait for.
         * @returns {?} Whatever the request's success param is.
         * @throws Error when the request fails.
         */
        _waitForRequest(request) {
            return new Promise((resolve, reject) => { // eslint-disable-line promise/avoid-new
                request.onsuccess = resolve;
                request.onerror = reject;
            });
        },
        versions: {
            upgrade2: async (e) => {
                const channels = e.target.transaction.objectStore(OBJECT_STORES.channels),
                    request = channels.openCursor(),
                    savePromise = [];
                return DatabaseManager._waitForCursor(request, (cursor) => {
                    const channel = cursor.value;
                    if(channel.live.alternateUsername || channel.live.alternateURL) {
                        channel.live.state = -1;
                    }
                    if(channel.live.alternateUsername) {
                        delete channel.live.alternateUsername;
                    }
                    if(channel.live.alternateURL) {
                        delete channel.live.alternateURL;
                    }
                    const r = cursor.update(channel);
                    savePromise.push(DatabaseManager._waitForRequest(r));
                }).then(() => Promise.all(savePromise));
            },
            initialize: async (e) => {
                const users = e.target.result.createObjectStore(OBJECT_STORES.users, {
                        keyPath: "id",
                        autoIncrement: true
                    }),
                    channels = e.target.result.createObjectStore(OBJECT_STORES.channels, {
                        keyPath: "id",
                        autoIncrement: true
                    });
                users.createIndex("typename", [
                    "type",
                    "login"
                ], { unique: true });
                users.createIndex("type", "type", { unique: false });
                channels.createIndex("typename", [
                    "type",
                    "login"
                ], { unique: true });
                channels.createIndex("type", "type", { unique: false });
            }
        },
        errorHandlers: [ (e) => {
            if(DatabaseManager.db) {
                DatabaseManager.db.close();
                DatabaseManager.db = null;
            }
            throw new FixListError(e);
        } ],
        successHandlers: [ (db) => {
            db.addEventListener("close", () => {
                DatabaseManager.db = null;
                DatabaseManager.emit("close");
            }, {
                passive: true,
                capture: false,
                once: true
            });
        } ],
        /**
         * Opens the DB, initializes the schema if it's a new DB or sets channels
         * offline that were online and have last been updated a certain time ago.
         *
         * @param {string} [name=ReadChannelList.name] - Name of the DB to open.
         * @param {boolean} [dontTry=false] - Don't try to fix the DB.
         * @async
         * @fires module:read-channel-list.ReadChannelList#ready
         * @returns {undefined} The DB is ready.
         * @throws Could not open the DB. Has a boolean that is true when a clear
         *         should be tried.
         */
        open(name = this.name, dontTry = false) {
            if(this.db !== null) {
                return Promise.resolve();
            }
            else if(this.loading === null) {
                this.loading = new Promise((resolve, reject) => {
                    // Try to open the DB
                    let request;
                    try {
                        request = window.indexedDB.open(name, VERSION);
                    }
                    catch(e) {
                        const error = new CantOpenListError();
                        reject(error);
                        this.emit("error", error);
                        throw error;
                    }

                    request.onupgradeneeded = (e) => {
                        let handler;
                        const upgradeHandlerName = `upgrade${e.oldVersion}`;
                        if(upgradeHandlerName in this.versions) {
                            handler = this.versions[upgradeHandlerName];
                        }
                        else {
                            handler = this.versions.initialize;
                        }
                        handler(e).catch(reject);
                    };

                    resolve(this._waitForRequest(request)
                        .then(async (e) => {
                            this.db = e.target.result;
                            if(!Object.values(OBJECT_STORES).every((store) => this.db.objectStoreNames.contains(store))) {
                                this.db = null;
                                throw new FixListError();
                            }
                            for(const handler of this.successHandlers) {
                                await handler(this.db);
                            }
                            this.error = null;
                            this.emit("ready");
                        })
                        .catch(async (error) => {
                            if(dontTry) {
                                this.db = null;
                                throw error;
                            }
                            let currentResolve = Promise.reject(error);
                            for(const handler of this.errorHandlers) {
                                currentResolve = currentResolve.catch(handler);
                            }
                            return currentResolve;
                        }));
                });
                this.loading = this.loading.catch((e) => {
                    this.error = e;
                    throw e;
                });
            }
            return this.loading;
        },
        emit(event, payload) {
            for(const list of this.lists.values()) {
                if(list.filterEvents(event, payload)) {
                    emit(list, event, payload);
                }
            }
        },
        registerList(list) {
            this.lists.add(list);
        },
        unregisterList(list) {
            this.lists.delete(list);
            if(!this.lists.size) {
                this.close();
            }
        },
        get ready() {
            if(this.loading !== null) {
                return this.loading;
            }
            return Promise.reject(new ListClosedError());
        },
        /**
         * Close the DB.
         *
         * @async
         * @returns {undefined} DB is being deleted, or may already be deleted.
         * @fires module:read-channel-list.ReadChannelList#close
         */
        close() {
            if(this.db !== null) {
                this.db.close();
                this.db = null;
                this.loading = null;
                this.emit("close");
            }
            return Promise.resolve();
        },
        registerSuccessHanlder(handler) {
            if(this.db !== null) {
                this.loading = this.loading.then(() => handler(this.db));
            }
            this.successHandlers.push(handler);
        },
        registerErrorHandler(handler) {
            if(this.db !== null) {
                this.loading = this.loading.catch(handler);
            }
            this.errorHandlers.push(handler);
        },
        delete() {
            const request = window.indexedDB.deleteDatabase(this.name);
            /* istanbul ignore next */
            request.onblocked = () => console.warn("Deleting database was blocked");

            // Reopen the DB after it's been cleared. Don't try to fix it, if it
            // doesn't want to open.
            return this._waitForRequest(request).then(() => {
                this.emit("clear", true);
            });
        }
    };

export default DatabaseManager;
