/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	var _notifier = __webpack_require__(1);

	var _notifier2 = _interopRequireDefault(_notifier);

	var _sdk = __webpack_require__(3);

	var _sdk2 = _interopRequireDefault(_sdk);

	var _utils = __webpack_require__(8);

	var _controller = __webpack_require__(9);

	var _controller2 = _interopRequireDefault(_controller);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _liveState = __webpack_require__(5);

	var _liveState2 = _interopRequireDefault(_liveState);

	var _list = __webpack_require__(42);

	var _list2 = _interopRequireDefault(_list);

	var _serialized = __webpack_require__(39);

	var _serialized2 = _interopRequireDefault(_serialized);

	var _service = __webpack_require__(17);

	var qs = _interopRequireWildcard(_service);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

	const PASSIVE_LISTENER = { passive: true };

	// Init things

	const notifier = new _notifier2.default(),
	      controller = new _controller2.default(),
	      list = new _list2.default();

	list.addEventListener("ready", () => {
	    controller.getChannelsByType().then(channels => view.addChannels(channels));

	    list.setProviders(_serialized2.default);

	    _preferences2.default.get(["updateInterval", "panel_style", "panel_extras", "theme"]).then(([updateInterval, style, extras, theme]) => {
	        list.setQueueStatus(parseInt(updateInterval, 10) !== 0);
	        list.setStyle(parseInt(style, 10));
	        list.setExtrasVisibility(extras);
	        list.setTheme(parseInt(theme, 10));
	    });
	}, PASSIVE_LISTENER);

	list.addEventListener("opencm", () => controller.showManager(), PASSIVE_LISTENER);
	list.addEventListener("addchannel", ({ detail: [login, type] }) => {
	    controller.addChannel(login, type);
	}, PASSIVE_LISTENER);
	list.addEventListener("refresh", ({ detail: channelId }) => {
	    if (channelId) {
	        controller.updateChannel(channelId);
	    } else {
	        controller.updateChannels();
	    }
	}, PASSIVE_LISTENER);
	list.addEventListener("open", ({ detail: [channelId, what] }) => {
	    let p;
	    if (typeof channelId === "string") {
	        p = Promise.resolve({
	            url: [channelId],
	            live: new _liveState2.default(_liveState2.default.LIVE)
	        });
	    } else {
	        p = controller.getChannel(channelId);
	    }

	    p.then(channel => (0, _utils.selectOrOpenTab)(channel, what));
	}, PASSIVE_LISTENER);
	list.addEventListener("pause", () => qs.pause(), PASSIVE_LISTENER);
	list.addEventListener("resume", () => qs.resume(), PASSIVE_LISTENER);
	list.addEventListener("copy", ({ detail: [channel, type] }) => {
	    controller.copyChannelURL(channel, type).then(channel => {
	        notifier.notifyCopied(channel.uname);
	    });
	});

	// Wire things up

	notifier.addEventListener("click", (() => {
	    var _ref = _asyncToGenerator(function* ({ detail: channelId }) {
	        const channel = yield controller.getChannel(channelId);
	        (0, _utils.selectOrOpenTab)(channel);
	    });

	    return function (_x) {
	        return _ref.apply(this, arguments);
	    };
	})(), PASSIVE_LISTENER);

	controller.addEventListener("channelupdated", ({ detail: channel }) => {
	    notifier.sendNotification(channel);
	    list.onChannelChanged(channel);
	}, PASSIVE_LISTENER);

	controller.addEventListener("channelsadded", ({ detail: channels }) => {
	    list.addChannels(channels);
	    channels.forEach(channel => notifier.sendNotification(channel));
	}, PASSIVE_LISTENER);

	controller.addEventListener("channeldeleted", ({ detail: channelId }) => {
	    notifier.onChannelRemoved(channelId);
	    list.removeChannel(channelId);
	}, PASSIVE_LISTENER);

	controller.addEventListener("beforechanneldeleted", () => qs.pause(), PASSIVE_LISTENER);
	//TODO do counting instead of relying on randomness being in our favor ;)
	controller.addEventListener("afterchanneldeleted", () => qs.resume(), PASSIVE_LISTENER);

	_preferences2.default.get(["theme", "panel_nonlive", "updateInterval", "queue_ratio", "queue_maxRequestBatchSize"]).then(([theme, nonlive, interval, ratio, batchSize]) => {
	    controller.setTheme(parseInt(theme, 10));
	    list.setNonLiveDisplay(nonlive);
	    qs.setOptions({
	        interval: S_TO_MS_FACTOR * interval,
	        amount: 1 / ratio,
	        maxSize: batchSize
	    });
	});

	qs.addListeners({
	    paused: () => list.setQueuePaused(true),
	    resumed: () => list.setQueuePaused(false)
	});

	_preferences2.default.addEventListener("change", ({ detail: { pref, value } }) => {
	    if (pref == "manageChannels") {
	        controller.showManager();
	    } else if (pref == "theme") {
	        const theme = parseInt(value, 10);
	        controller.setTheme(theme);
	        list.setTheme(theme);
	    } else if (pref == "panel_nonlive") {
	        list.setNonLiveDisplay(parseInt(value, 10));
	    } else if (pref == "panel_extras") {
	        list.setExtrasVisibility(value);
	    } else if (pref == "panel_style") {
	        list.setStyle(parseInt(value, 10));
	    } else if (pref == "updateInterval") {
	        const interval = parseInt(value, 10);
	        qs.updateOptions(S_TO_MS_FACTOR * interval);
	        list.setQueueStatus(interval !== 0);
	    }
	}, PASSIVE_LISTENER);

	// Do migration of channel data if necessary
	browser.storage.local.get("migrated").then(value => {
	    if (!value.migrated) {
	        sdk.doAction("migrate-channels").then(([channels, users]) => {
	            return Promise.all(users.map(user => controller.addUser(user.login, user.type))).then(() => Promise.all(channels.map(channel => controller.addChannel(channel.login, channel.type))));
	        }).then(() => {
	            return browser.storage.local.set({
	                migrated: true
	            });
	        });
	    }
	});

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _liveState = __webpack_require__(5);

	var _liveState2 = _interopRequireDefault(_liveState);

	var _logic = __webpack_require__(7);

	var _utils = __webpack_require__(4);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Model for the Notifications
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module notifier
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */

	const _ = browser.i18n.getMessage;

	/**
	 * Size of the image shown in the notification.
	 * @const {number}
	 * @default 100
	 */
	const NOTIFICATION_ICON_SIZE = 100;

	/**
	 * @class module:notifier.Notifier
	 * @extends EventEmitter
	 */
	class Notifier extends EventEmitter {
	    /**
	     * @constructs
	     * @param {Object} options - Event listeners, namely onClick listener as
	     *                           property of the object.
	     */
	    constructor(options) {
	        super();
	        /**
	         * The last title of each channel by id the notifier last saw.
	         *
	         * @type {Map.<number, string>}
	         */
	        this.channelTitles = new Map();
	        /**
	         * Proprietary thing I'm too tired to explain, but it stores the relevant
	         * info about a channel's current state.
	         *
	         * @type {Map.<number, object>}
	         */
	        this.channelStates = new Map();
	        browser.notifications.onClicked.addListener(id => {
	            if (id.startsWith("cn")) {
	                (0, _utils.emit)(this, "click", id.substr(2));
	            }
	        });
	    }

	    /**
	     * If online notifications should be shown.
	     *
	     * @returns {boolean}
	     * @async
	     */
	    onlineNotifications() {
	        return _preferences2.default.get("onlineNotification");
	    }
	    /**
	     * If title change notifications should be shown.
	     *
	     * @returns {boolean}
	     * @async
	     */
	    titleNotifications() {
	        return _preferences2.default.get("titleChangeNotification");
	    }
	    /**
	     * If offline notifications should be shown.
	     *
	     * @returns {boolean}
	     * @async
	     */
	    offlineNotifications() {
	        return _preferences2.default.get("offlineNotification");
	    }
	    /**
	     * If non-live types are handled like a non-binary state, they get custom
	     * notifications when this is set.
	     *
	     * @returns {boolean}
	     * @async
	     */
	    nonliveNotifications() {
	        return _preferences2.default.get("nonliveNotification");
	    }
	    /**
	     * If any notifications are to be shown.
	     *
	     * @returns {boolean}
	     * @async
	     */
	    showNotifications() {
	        return (0, _logic.and)(this.onlineNotifications(), this.titleNotifications(), this.offlineNotifications(), this.nonliveNotifications());
	    }
	    /**
	     * Store a channel's state.
	     *
	     * @param {module:channel/core.Channel} channel - The channel to store.
	     */
	    _setChannelState(channel) {
	        this.channelStates.set(channel.id, {
	            state: channel.live.state,
	            user: channel.live.alternateUsername
	        });
	    }
	    /**
	     * Determine if the state of a channel has changed.
	     *
	     * @param {module:channel/core.Channel} channel - The channel that might
	     *                                                have changed.
	     * @returns {boolean}
	     */
	    _channelStateChanged(channel) {
	        const oldState = this.channelStates.get(channel.id);
	        return oldState === undefined || oldState.state != channel.live.state || channel.live.state > _liveState2.default.LIVE && oldState.user != channel.live.alternateUsername;
	    }
	    _getLiveInterpretation() {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            if (yield _this.nonliveNotifications()) {
	                return _liveState2.default.TOWARD_LIVE;
	            } else {
	                return _liveState2.default.TOWARD_OFFLINE;
	            }
	        })();
	    }
	    /**
	     * Show a notification to the user, if the channel isn't in the currently
	     * active tab, the channel changed accordingly and the respective
	     * notification is activated.
	     * This also manages the {@link module:notifier.Notifier~channelTitles} Map.
	     *
	     * @param {module:channel/core.Channel} channel - The channel to show a
	     *                                                notification for.
	     */
	    sendNotification(channel) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            // Mute notifications for the current tab
	            const [tab, showNotifications] = yield Promise.all([browser.tabs.query({
	                active: true,
	                currentWindow: true
	            }), _this2.showNotifications()]);
	            if (showNotifications && !channel.url.some(function (url) {
	                return url === tab.url;
	            })) {
	                const liveInterpretation = yield _this2._getLiveInterpretation();
	                let title = null;
	                if ((yield (0, _logic.and)(channel.live.isLive(_liveState2.default.TOWARD_OFFLINE), _this2.onlineNotifications())) && _this2._channelStateChanged(channel)) {
	                    title = _("onlineNotification", channel.toString());
	                } else if ((yield (0, _logic.and)(channel.live.isLive(liveInterpretation), _this2.titleNotifications(), (0, _logic.or)(channel.live.state === _liveState2.default.LIVE, _this2.nonliveNotifications()))) && !_this2._channelStateChanged(channel) && _this2.channelTitles.get(channel.id) != channel.title) {
	                    title = _("updateNotification", channel.toString());
	                } else if ((yield (0, _logic.and)((0, _logic.not)(channel.live.isLive(liveInterpretation)), _this2.offlineNotifications())) && _this2.channelTitles.has(channel.id)) {
	                    title = _("offlineNotification", channel.toString());
	                } else if (channel.live.state > _liveState2.default.LIVE && (yield _this2.nonliveNotifications()) && _this2._channelStateChanged(channel)) {
	                    const stateName = _liveState2.default.REDIRECT === channel.live.state ? "Redirect" : "Rebroadcast";
	                    title = _("nonliveNotification", [channel.toString(), _("nonliveNotificationState" + stateName, channel.live.alternateUsername)]);
	                }

	                if (title !== null) {
	                    browser.notifications.create(`cn${ channel.id }`, {
	                        type: "basic",
	                        title,
	                        message: channel.title,
	                        iconUrl: channel.getBestImageForSize(NOTIFICATION_ICON_SIZE)
	                    });
	                }
	            }

	            if (yield channel.live.isLive()) {
	                _this2.channelTitles.set(channel.id, channel.title);
	            } else {
	                _this2.channelTitles.delete(channel.id);
	            }

	            _this2._setChannelState(channel);
	        })();
	    }
	    /**
	     * Callback to call, whenever an event gets removed. This removes the
	     * channel from the internal map.
	     *
	     * @param {number} channelId - ID of the channel that was removed.
	     */
	    onChannelRemoved(channelId) {
	        if (this.channelTitles.has(channelId)) {
	            this.channelTitles.delete(channelId);
	        }
	        if (this.channelStates.has(channelId)) {
	            this.channelStates.delete(channelId);
	        }
	    }

	    /**
	     * Notify the user, that the string has been copied to the clipboard.
	     *
	     * @param {string} channelName - Name of the channel that was copied.
	     */
	    notifyCopied(channelName) {
	        browser.notifications.create("copy", {
	            title: _("copyNotification", channelName),
	            iconURL: "../images/icon64.png"
	        });
	    }
	}
	exports.default = Notifier;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _sdk = __webpack_require__(3);

	var _sdk2 = _interopRequireDefault(_sdk);

	var _utils = __webpack_require__(4);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	//TODO move to storage.local & options_ui

	class Preferences extends EventTarget {
	    constructor() {
	        super();
	        _sdk2.default.addEventListener("message", ({ detail: message }) => {
	            if (message.target == "pref-change") {
	                (0, _utils.emit)(this, "change", message);
	            }
	        });
	    }

	    get(pref) {
	        if (Array.isArray(pref)) {
	            return Promise.all(pref.map(p => this.get(p)));
	        } else {
	            return _sdk2.default.doAction({
	                target: "get-pref",
	                pref
	            });
	        }
	    }

	    set(pref, value) {
	        return _sdk2.default.doAction({
	            target: "set-pref",
	            pref,
	            value
	        });
	    }

	    open() {
	        _sdk2.default.postMessage("pref-open");
	    }
	};

	exports.default = new Preferences();

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	class SDKCommunication extends EventTarget {
	    constructor() {
	        super();
	        this.port = browser.runtime.connect({ name: "sdk-connection" });
	        this.port.onMessage.addListener(message => {
	            (0, _utils.emit)(this, "message", message);
	        });
	    }

	    postMessage(message) {
	        this.port.postMessage(message);
	    }

	    doAction(message) {
	        return new Promise((resolve, reject) => {
	            // Can't use the once infrastructure since other replies might come in first.
	            const waitForAction = ({ detail }) => {
	                if (detail.target == message.target + "-reply") {
	                    this.removeEventListener("message", waitForAction, false);
	                    if (!detail.error) {
	                        resolve(detail.payload);
	                    } else {
	                        resolve(detail.error);
	                    }
	                }
	            };
	            this.addEventListener("message", waitForAction, false);
	            this.postMessage(message);
	        });
	    }
	} /**
	   * SDK communication helper.
	   *
	   * @author Martin Giger
	   * @license MPL-2.0
	   */
	exports.default = new SDKCommunication();

/***/ },
/* 4 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

	/**
	 * Concurrency utils for events.
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 */

	const when = exports.when = (target, event) => {
	    if (target instanceof EventTarget) {
	        return new Promsie((resolve, reject) => {
	            target.addEventListener(event, resolve, {
	                once: true,
	                capture: false
	            });
	        });
	    } else if ("on" + event[0].toUpperCase() + event.substr(1) in target) {
	        return new Promise((resolve, reject) => {
	            const property = "on" + event[0].toUpperCase() + event.substr(1),
	                  listener = e => {
	                target[property].removeListener(listener);
	                resolve(e);
	            };
	            target[property].addListener(listener);
	        });
	    }
	};

	const emit = exports.emit = (target, event, ...detail) => {
	    if (detail.length) {
	        if (detail.length == 1) {
	            detail = detail[0];
	        }
	        target.dispatchEvent(new CustomEvent(event, { detail }));
	    } else {
	        target.dispatchEvent(new Event(event));
	    }
	};

	/**
	 * So this is a magic function. It makes things work by being kind of a reversed
	 * once. But let me explain: this function will only execute the function if it
	 * is the most recently registered one. The first argument has to be an unique
	 * id, which is used to check if the callback is the most recent one.
	 * This is used to avoid race conditions with DB callbacks when channels are
	 * deleted.
	 *
	 * @param {*} newId - An id for this new callback.
	 * @param {Function} fn - Needs to be the same callback to work.
	 * @returns {Function} Function that is "debounced".
	 */
	const invokeOnce = exports.invokeOnce = (newId, fn) => {
	    fn.currentId = newId;
	    return function (...args) {
	        if (fn.currentId == newId) {
	            delete fn.currentId;
	            fn(...args);
	        }
	    };
	};

	/**
	 * Filter an array based on a condition that is returned as promise. Like
	 * Array.prototype.filter, just that it takes a promise from the callback
	 * isntead of a boolean.
	 *
	 * @param {Array} array - Array to filter
	 * @param {Function} callback - Callback to filter on. Should return a promise.
	 * @returns {Array} Array filtered based on the result of the callback.
	 */
	const filterAsync = exports.filterAsync = (() => {
	    var _ref = _asyncToGenerator(function* (array, callback) {
	        const predicates = yield Promise.all(array.map(callback));
	        return array.filter(function (a, i) {
	            return predicates[i];
	        });
	    });

	    return function filterAsync(_x, _x2) {
	        return _ref.apply(this, arguments);
	    };
	})();

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _underscore = __webpack_require__(6);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Represents information for non-live streams.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module channel/live-state
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @todo Replace alternate properties with a serialized channel (to avoid require loops)
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	/**
	 * @typedef {number} LiveStateIndicator
	 */
	/**
	 * @typedef {Object} SerializedLiveState
	 * @property {module:channel/live-state~LiveStateIndicator} state
	 * @property {string} alternateUsername
	 * @property {string} alternateURL
	 * @see {@link module:channel/live-state.LiveState}
	 */
	/**
	 * Constant for how the live state is to be interpreted in a boolean scenario.
	 *
	 * @typedef {number} LiveStateInterpretation
	 */

	const IGNORED_PROPERTIES = ["state", "isLive"],
	      OFFLINE = -1,
	      LIVE = 0,
	      REDIRECT = 1,
	      REBROADCAST = 2,
	      TOWARD_LIVE = 0,
	      TOWARD_OFFLINE = 1,
	      getDefaultInterpretation = () => {
	  return _preferences2.default.get("panel_nonlive").then(value => {
	    return parseInt(value, 10) < 3 ? TOWARD_LIVE : TOWARD_OFFLINE;
	  });
	};

	/**
	 * Used to describe the exact state of a stream. Sometimes streams are marked
	 * as rebroadcasts or are a re-stream from a different source.
	 *
	 * @class module:channel/live-state.LiveState
	 */
	class LiveState {

	  /**
	   * @param {module:channel/live-state~SerializedLiveState} serializedLiveState
	   *                      - LiveState represented as JSON serializable object.
	   * @returns {module:channel/live-state.LiveState} LiveState derrived from
	   *          the specification of the serialized version.
	   */


	  /**
	   * Interprets everything but offline as live.
	   *
	   * @type {module:channel/live-state~LiveStateInterpretation}
	   * @default 0
	   * @const
	   */

	  /**
	   * Indicates the channel is hosting another channel or similar.
	   *
	   * @const
	   * @type {module:channel/live-state~LiveStateIndicator}
	   * @alias module:channel/live-state.LiveState.REDIRECT
	   * @default 1
	   * @see {@link module:channel/live-state.LiveState.LIVE}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.OFFLINE}
	   */

	  /**
	   * Indicates that the channel is offline.
	   *
	   * @const
	   * @type {module:channel/live-state~LiveStateIndicator}
	   * @alias module:channel/live-state.LiveState.OFFLINE
	   * @default 0
	   * @see {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.LIVE}
	   */
	  static deserialize(serializedLiveState) {
	    const props = (0, _underscore.omit)(serializedLiveState, IGNORED_PROPERTIES);
	    return Object.assign(new LiveState(serializedLiveState.state), props);
	  }
	  /**
	   * Interprets everything but live as offline.
	   *
	   * @type {module:channel/live-state~LiveStateInterpretation}
	   * @default 1
	   * @const
	   */

	  /**
	   * The channel is rebroadcasting a previous broadcast.
	   *
	   * @const
	   * @type {module:channel/live-state~LiveStateIndicator}
	   * @alias module:channel/live-state.LiveState.REBROADCAST
	   * @default 2
	   * @see {@link module:channel/live-state.LiveState.LIVE}, {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.OFFLINE}
	   */

	  /**
	   * Indicates that the channel is live.
	   *
	   * @const
	   * @type {module:channel/live-state~LiveStateIndicator}
	   * @alias module:channel/live-state.LiveState.LIVE
	   * @default 0
	   * @see {@link module:channel/live-state.LiveState.REDIRECT}, {@link module:channel/live-state.LiveState.REBROADCAST}, {@link module:channel/live-state.LiveState.OFFLINE}
	   */


	  /**
	   * @constructs
	   * @param {module:channel/live-state~LiveStateIndicator} [state={@link module:channel/live-state.LiveState.OFFLINE}]
	   *                                   - Initial state, defaulting to offline.
	   */
	  constructor(state = OFFLINE) {
	    this.alternateUsername = "";
	    this.alternateURL = "";

	    this._state = state;
	  }
	  /**
	   * The state descriptor of this LiveState.
	   *
	   * @type {module:channel/live-state~LiveStateIndicator}
	   * @readonly
	   */
	  get state() {
	    return this._state;
	  }
	  /**
	   * The default interpretation mode based on a user's preference.
	   *
	   * @type {module:channel/live-state~LiveStateInterpretation}
	   * @async
	   */
	  static defaultInterpretation() {
	    return getDefaultInterpretation();
	  }
	  /**
	   * Serialize the LiveState.
	   *
	   * @returns {module:channel/live-state~SerializedLiveState} JSON
	   *          serializable object representation of the live state.
	   */
	  serialize() {
	    return {
	      state: this.state,
	      alternateUsername: this.alternateUsername,
	      alternateURL: this.alternateURL,
	      isLive: this.isLive()
	    };
	  }
	  /**
	   * Interpret the live state to a boolean decision.
	   *
	   * @param {module:channel/live-state~LiveStateInterpretation} [interpretation]
	   *                                - How to interpret live states as boolean.
	   * @returns {boolean} Whether the live state should be considered live.
	   */
	  isLive(interpretation) {
	    var _this = this;

	    return _asyncToGenerator(function* () {
	      if (!interpretation) {
	        interpretation = yield getDefaultInterpretation();
	      }

	      if (interpretation === TOWARD_LIVE) {
	        return _this.state !== OFFLINE;
	      } else if (interpretation === TOWARD_OFFLINE) {
	        return _this.state === LIVE;
	      }
	    })();
	  }
	  /**
	   * Set the state to live or not live. Simple as can be.
	   *
	   * @param {boolean} live - Shortcut to set the object to simple states.
	   */
	  setLive(live) {
	    this._state = live ? LIVE : OFFLINE;
	    this.alternateUsername = "";
	    this.alternateURL = "";
	  }
	}

	LiveState.OFFLINE = OFFLINE;
	LiveState.LIVE = LIVE;
	LiveState.REDIRECT = REDIRECT;
	LiveState.REBROADCAST = REBROADCAST;
	LiveState.TOWARD_LIVE = TOWARD_LIVE;
	LiveState.TOWARD_OFFLINE = TOWARD_OFFLINE;
	exports.default = LiveState;

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	var __WEBPACK_AMD_DEFINE_ARRAY__, __WEBPACK_AMD_DEFINE_RESULT__;//     Underscore.js 1.8.3
	//     http://underscorejs.org
	//     (c) 2009-2015 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	//     Underscore may be freely distributed under the MIT license.

	(function() {

	  // Baseline setup
	  // --------------

	  // Establish the root object, `window` in the browser, or `exports` on the server.
	  var root = this;

	  // Save the previous value of the `_` variable.
	  var previousUnderscore = root._;

	  // Save bytes in the minified (but not gzipped) version:
	  var ArrayProto = Array.prototype, ObjProto = Object.prototype, FuncProto = Function.prototype;

	  // Create quick reference variables for speed access to core prototypes.
	  var
	    push             = ArrayProto.push,
	    slice            = ArrayProto.slice,
	    toString         = ObjProto.toString,
	    hasOwnProperty   = ObjProto.hasOwnProperty;

	  // All **ECMAScript 5** native function implementations that we hope to use
	  // are declared here.
	  var
	    nativeIsArray      = Array.isArray,
	    nativeKeys         = Object.keys,
	    nativeBind         = FuncProto.bind,
	    nativeCreate       = Object.create;

	  // Naked function reference for surrogate-prototype-swapping.
	  var Ctor = function(){};

	  // Create a safe reference to the Underscore object for use below.
	  var _ = function(obj) {
	    if (obj instanceof _) return obj;
	    if (!(this instanceof _)) return new _(obj);
	    this._wrapped = obj;
	  };

	  // Export the Underscore object for **Node.js**, with
	  // backwards-compatibility for the old `require()` API. If we're in
	  // the browser, add `_` as a global object.
	  if (true) {
	    if (typeof module !== 'undefined' && module.exports) {
	      exports = module.exports = _;
	    }
	    exports._ = _;
	  } else {
	    root._ = _;
	  }

	  // Current version.
	  _.VERSION = '1.8.3';

	  // Internal function that returns an efficient (for current engines) version
	  // of the passed-in callback, to be repeatedly applied in other Underscore
	  // functions.
	  var optimizeCb = function(func, context, argCount) {
	    if (context === void 0) return func;
	    switch (argCount == null ? 3 : argCount) {
	      case 1: return function(value) {
	        return func.call(context, value);
	      };
	      case 2: return function(value, other) {
	        return func.call(context, value, other);
	      };
	      case 3: return function(value, index, collection) {
	        return func.call(context, value, index, collection);
	      };
	      case 4: return function(accumulator, value, index, collection) {
	        return func.call(context, accumulator, value, index, collection);
	      };
	    }
	    return function() {
	      return func.apply(context, arguments);
	    };
	  };

	  // A mostly-internal function to generate callbacks that can be applied
	  // to each element in a collection, returning the desired result — either
	  // identity, an arbitrary callback, a property matcher, or a property accessor.
	  var cb = function(value, context, argCount) {
	    if (value == null) return _.identity;
	    if (_.isFunction(value)) return optimizeCb(value, context, argCount);
	    if (_.isObject(value)) return _.matcher(value);
	    return _.property(value);
	  };
	  _.iteratee = function(value, context) {
	    return cb(value, context, Infinity);
	  };

	  // An internal function for creating assigner functions.
	  var createAssigner = function(keysFunc, undefinedOnly) {
	    return function(obj) {
	      var length = arguments.length;
	      if (length < 2 || obj == null) return obj;
	      for (var index = 1; index < length; index++) {
	        var source = arguments[index],
	            keys = keysFunc(source),
	            l = keys.length;
	        for (var i = 0; i < l; i++) {
	          var key = keys[i];
	          if (!undefinedOnly || obj[key] === void 0) obj[key] = source[key];
	        }
	      }
	      return obj;
	    };
	  };

	  // An internal function for creating a new object that inherits from another.
	  var baseCreate = function(prototype) {
	    if (!_.isObject(prototype)) return {};
	    if (nativeCreate) return nativeCreate(prototype);
	    Ctor.prototype = prototype;
	    var result = new Ctor;
	    Ctor.prototype = null;
	    return result;
	  };

	  var property = function(key) {
	    return function(obj) {
	      return obj == null ? void 0 : obj[key];
	    };
	  };

	  // Helper for collection methods to determine whether a collection
	  // should be iterated as an array or as an object
	  // Related: http://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
	  // Avoids a very nasty iOS 8 JIT bug on ARM-64. #2094
	  var MAX_ARRAY_INDEX = Math.pow(2, 53) - 1;
	  var getLength = property('length');
	  var isArrayLike = function(collection) {
	    var length = getLength(collection);
	    return typeof length == 'number' && length >= 0 && length <= MAX_ARRAY_INDEX;
	  };

	  // Collection Functions
	  // --------------------

	  // The cornerstone, an `each` implementation, aka `forEach`.
	  // Handles raw objects in addition to array-likes. Treats all
	  // sparse array-likes as if they were dense.
	  _.each = _.forEach = function(obj, iteratee, context) {
	    iteratee = optimizeCb(iteratee, context);
	    var i, length;
	    if (isArrayLike(obj)) {
	      for (i = 0, length = obj.length; i < length; i++) {
	        iteratee(obj[i], i, obj);
	      }
	    } else {
	      var keys = _.keys(obj);
	      for (i = 0, length = keys.length; i < length; i++) {
	        iteratee(obj[keys[i]], keys[i], obj);
	      }
	    }
	    return obj;
	  };

	  // Return the results of applying the iteratee to each element.
	  _.map = _.collect = function(obj, iteratee, context) {
	    iteratee = cb(iteratee, context);
	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length,
	        results = Array(length);
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      results[index] = iteratee(obj[currentKey], currentKey, obj);
	    }
	    return results;
	  };

	  // Create a reducing function iterating left or right.
	  function createReduce(dir) {
	    // Optimized iterator function as using arguments.length
	    // in the main function will deoptimize the, see #1991.
	    function iterator(obj, iteratee, memo, keys, index, length) {
	      for (; index >= 0 && index < length; index += dir) {
	        var currentKey = keys ? keys[index] : index;
	        memo = iteratee(memo, obj[currentKey], currentKey, obj);
	      }
	      return memo;
	    }

	    return function(obj, iteratee, memo, context) {
	      iteratee = optimizeCb(iteratee, context, 4);
	      var keys = !isArrayLike(obj) && _.keys(obj),
	          length = (keys || obj).length,
	          index = dir > 0 ? 0 : length - 1;
	      // Determine the initial value if none is provided.
	      if (arguments.length < 3) {
	        memo = obj[keys ? keys[index] : index];
	        index += dir;
	      }
	      return iterator(obj, iteratee, memo, keys, index, length);
	    };
	  }

	  // **Reduce** builds up a single result from a list of values, aka `inject`,
	  // or `foldl`.
	  _.reduce = _.foldl = _.inject = createReduce(1);

	  // The right-associative version of reduce, also known as `foldr`.
	  _.reduceRight = _.foldr = createReduce(-1);

	  // Return the first value which passes a truth test. Aliased as `detect`.
	  _.find = _.detect = function(obj, predicate, context) {
	    var key;
	    if (isArrayLike(obj)) {
	      key = _.findIndex(obj, predicate, context);
	    } else {
	      key = _.findKey(obj, predicate, context);
	    }
	    if (key !== void 0 && key !== -1) return obj[key];
	  };

	  // Return all the elements that pass a truth test.
	  // Aliased as `select`.
	  _.filter = _.select = function(obj, predicate, context) {
	    var results = [];
	    predicate = cb(predicate, context);
	    _.each(obj, function(value, index, list) {
	      if (predicate(value, index, list)) results.push(value);
	    });
	    return results;
	  };

	  // Return all the elements for which a truth test fails.
	  _.reject = function(obj, predicate, context) {
	    return _.filter(obj, _.negate(cb(predicate)), context);
	  };

	  // Determine whether all of the elements match a truth test.
	  // Aliased as `all`.
	  _.every = _.all = function(obj, predicate, context) {
	    predicate = cb(predicate, context);
	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length;
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      if (!predicate(obj[currentKey], currentKey, obj)) return false;
	    }
	    return true;
	  };

	  // Determine if at least one element in the object matches a truth test.
	  // Aliased as `any`.
	  _.some = _.any = function(obj, predicate, context) {
	    predicate = cb(predicate, context);
	    var keys = !isArrayLike(obj) && _.keys(obj),
	        length = (keys || obj).length;
	    for (var index = 0; index < length; index++) {
	      var currentKey = keys ? keys[index] : index;
	      if (predicate(obj[currentKey], currentKey, obj)) return true;
	    }
	    return false;
	  };

	  // Determine if the array or object contains a given item (using `===`).
	  // Aliased as `includes` and `include`.
	  _.contains = _.includes = _.include = function(obj, item, fromIndex, guard) {
	    if (!isArrayLike(obj)) obj = _.values(obj);
	    if (typeof fromIndex != 'number' || guard) fromIndex = 0;
	    return _.indexOf(obj, item, fromIndex) >= 0;
	  };

	  // Invoke a method (with arguments) on every item in a collection.
	  _.invoke = function(obj, method) {
	    var args = slice.call(arguments, 2);
	    var isFunc = _.isFunction(method);
	    return _.map(obj, function(value) {
	      var func = isFunc ? method : value[method];
	      return func == null ? func : func.apply(value, args);
	    });
	  };

	  // Convenience version of a common use case of `map`: fetching a property.
	  _.pluck = function(obj, key) {
	    return _.map(obj, _.property(key));
	  };

	  // Convenience version of a common use case of `filter`: selecting only objects
	  // containing specific `key:value` pairs.
	  _.where = function(obj, attrs) {
	    return _.filter(obj, _.matcher(attrs));
	  };

	  // Convenience version of a common use case of `find`: getting the first object
	  // containing specific `key:value` pairs.
	  _.findWhere = function(obj, attrs) {
	    return _.find(obj, _.matcher(attrs));
	  };

	  // Return the maximum element (or element-based computation).
	  _.max = function(obj, iteratee, context) {
	    var result = -Infinity, lastComputed = -Infinity,
	        value, computed;
	    if (iteratee == null && obj != null) {
	      obj = isArrayLike(obj) ? obj : _.values(obj);
	      for (var i = 0, length = obj.length; i < length; i++) {
	        value = obj[i];
	        if (value > result) {
	          result = value;
	        }
	      }
	    } else {
	      iteratee = cb(iteratee, context);
	      _.each(obj, function(value, index, list) {
	        computed = iteratee(value, index, list);
	        if (computed > lastComputed || computed === -Infinity && result === -Infinity) {
	          result = value;
	          lastComputed = computed;
	        }
	      });
	    }
	    return result;
	  };

	  // Return the minimum element (or element-based computation).
	  _.min = function(obj, iteratee, context) {
	    var result = Infinity, lastComputed = Infinity,
	        value, computed;
	    if (iteratee == null && obj != null) {
	      obj = isArrayLike(obj) ? obj : _.values(obj);
	      for (var i = 0, length = obj.length; i < length; i++) {
	        value = obj[i];
	        if (value < result) {
	          result = value;
	        }
	      }
	    } else {
	      iteratee = cb(iteratee, context);
	      _.each(obj, function(value, index, list) {
	        computed = iteratee(value, index, list);
	        if (computed < lastComputed || computed === Infinity && result === Infinity) {
	          result = value;
	          lastComputed = computed;
	        }
	      });
	    }
	    return result;
	  };

	  // Shuffle a collection, using the modern version of the
	  // [Fisher-Yates shuffle](http://en.wikipedia.org/wiki/Fisher–Yates_shuffle).
	  _.shuffle = function(obj) {
	    var set = isArrayLike(obj) ? obj : _.values(obj);
	    var length = set.length;
	    var shuffled = Array(length);
	    for (var index = 0, rand; index < length; index++) {
	      rand = _.random(0, index);
	      if (rand !== index) shuffled[index] = shuffled[rand];
	      shuffled[rand] = set[index];
	    }
	    return shuffled;
	  };

	  // Sample **n** random values from a collection.
	  // If **n** is not specified, returns a single random element.
	  // The internal `guard` argument allows it to work with `map`.
	  _.sample = function(obj, n, guard) {
	    if (n == null || guard) {
	      if (!isArrayLike(obj)) obj = _.values(obj);
	      return obj[_.random(obj.length - 1)];
	    }
	    return _.shuffle(obj).slice(0, Math.max(0, n));
	  };

	  // Sort the object's values by a criterion produced by an iteratee.
	  _.sortBy = function(obj, iteratee, context) {
	    iteratee = cb(iteratee, context);
	    return _.pluck(_.map(obj, function(value, index, list) {
	      return {
	        value: value,
	        index: index,
	        criteria: iteratee(value, index, list)
	      };
	    }).sort(function(left, right) {
	      var a = left.criteria;
	      var b = right.criteria;
	      if (a !== b) {
	        if (a > b || a === void 0) return 1;
	        if (a < b || b === void 0) return -1;
	      }
	      return left.index - right.index;
	    }), 'value');
	  };

	  // An internal function used for aggregate "group by" operations.
	  var group = function(behavior) {
	    return function(obj, iteratee, context) {
	      var result = {};
	      iteratee = cb(iteratee, context);
	      _.each(obj, function(value, index) {
	        var key = iteratee(value, index, obj);
	        behavior(result, value, key);
	      });
	      return result;
	    };
	  };

	  // Groups the object's values by a criterion. Pass either a string attribute
	  // to group by, or a function that returns the criterion.
	  _.groupBy = group(function(result, value, key) {
	    if (_.has(result, key)) result[key].push(value); else result[key] = [value];
	  });

	  // Indexes the object's values by a criterion, similar to `groupBy`, but for
	  // when you know that your index values will be unique.
	  _.indexBy = group(function(result, value, key) {
	    result[key] = value;
	  });

	  // Counts instances of an object that group by a certain criterion. Pass
	  // either a string attribute to count by, or a function that returns the
	  // criterion.
	  _.countBy = group(function(result, value, key) {
	    if (_.has(result, key)) result[key]++; else result[key] = 1;
	  });

	  // Safely create a real, live array from anything iterable.
	  _.toArray = function(obj) {
	    if (!obj) return [];
	    if (_.isArray(obj)) return slice.call(obj);
	    if (isArrayLike(obj)) return _.map(obj, _.identity);
	    return _.values(obj);
	  };

	  // Return the number of elements in an object.
	  _.size = function(obj) {
	    if (obj == null) return 0;
	    return isArrayLike(obj) ? obj.length : _.keys(obj).length;
	  };

	  // Split a collection into two arrays: one whose elements all satisfy the given
	  // predicate, and one whose elements all do not satisfy the predicate.
	  _.partition = function(obj, predicate, context) {
	    predicate = cb(predicate, context);
	    var pass = [], fail = [];
	    _.each(obj, function(value, key, obj) {
	      (predicate(value, key, obj) ? pass : fail).push(value);
	    });
	    return [pass, fail];
	  };

	  // Array Functions
	  // ---------------

	  // Get the first element of an array. Passing **n** will return the first N
	  // values in the array. Aliased as `head` and `take`. The **guard** check
	  // allows it to work with `_.map`.
	  _.first = _.head = _.take = function(array, n, guard) {
	    if (array == null) return void 0;
	    if (n == null || guard) return array[0];
	    return _.initial(array, array.length - n);
	  };

	  // Returns everything but the last entry of the array. Especially useful on
	  // the arguments object. Passing **n** will return all the values in
	  // the array, excluding the last N.
	  _.initial = function(array, n, guard) {
	    return slice.call(array, 0, Math.max(0, array.length - (n == null || guard ? 1 : n)));
	  };

	  // Get the last element of an array. Passing **n** will return the last N
	  // values in the array.
	  _.last = function(array, n, guard) {
	    if (array == null) return void 0;
	    if (n == null || guard) return array[array.length - 1];
	    return _.rest(array, Math.max(0, array.length - n));
	  };

	  // Returns everything but the first entry of the array. Aliased as `tail` and `drop`.
	  // Especially useful on the arguments object. Passing an **n** will return
	  // the rest N values in the array.
	  _.rest = _.tail = _.drop = function(array, n, guard) {
	    return slice.call(array, n == null || guard ? 1 : n);
	  };

	  // Trim out all falsy values from an array.
	  _.compact = function(array) {
	    return _.filter(array, _.identity);
	  };

	  // Internal implementation of a recursive `flatten` function.
	  var flatten = function(input, shallow, strict, startIndex) {
	    var output = [], idx = 0;
	    for (var i = startIndex || 0, length = getLength(input); i < length; i++) {
	      var value = input[i];
	      if (isArrayLike(value) && (_.isArray(value) || _.isArguments(value))) {
	        //flatten current level of array or arguments object
	        if (!shallow) value = flatten(value, shallow, strict);
	        var j = 0, len = value.length;
	        output.length += len;
	        while (j < len) {
	          output[idx++] = value[j++];
	        }
	      } else if (!strict) {
	        output[idx++] = value;
	      }
	    }
	    return output;
	  };

	  // Flatten out an array, either recursively (by default), or just one level.
	  _.flatten = function(array, shallow) {
	    return flatten(array, shallow, false);
	  };

	  // Return a version of the array that does not contain the specified value(s).
	  _.without = function(array) {
	    return _.difference(array, slice.call(arguments, 1));
	  };

	  // Produce a duplicate-free version of the array. If the array has already
	  // been sorted, you have the option of using a faster algorithm.
	  // Aliased as `unique`.
	  _.uniq = _.unique = function(array, isSorted, iteratee, context) {
	    if (!_.isBoolean(isSorted)) {
	      context = iteratee;
	      iteratee = isSorted;
	      isSorted = false;
	    }
	    if (iteratee != null) iteratee = cb(iteratee, context);
	    var result = [];
	    var seen = [];
	    for (var i = 0, length = getLength(array); i < length; i++) {
	      var value = array[i],
	          computed = iteratee ? iteratee(value, i, array) : value;
	      if (isSorted) {
	        if (!i || seen !== computed) result.push(value);
	        seen = computed;
	      } else if (iteratee) {
	        if (!_.contains(seen, computed)) {
	          seen.push(computed);
	          result.push(value);
	        }
	      } else if (!_.contains(result, value)) {
	        result.push(value);
	      }
	    }
	    return result;
	  };

	  // Produce an array that contains the union: each distinct element from all of
	  // the passed-in arrays.
	  _.union = function() {
	    return _.uniq(flatten(arguments, true, true));
	  };

	  // Produce an array that contains every item shared between all the
	  // passed-in arrays.
	  _.intersection = function(array) {
	    var result = [];
	    var argsLength = arguments.length;
	    for (var i = 0, length = getLength(array); i < length; i++) {
	      var item = array[i];
	      if (_.contains(result, item)) continue;
	      for (var j = 1; j < argsLength; j++) {
	        if (!_.contains(arguments[j], item)) break;
	      }
	      if (j === argsLength) result.push(item);
	    }
	    return result;
	  };

	  // Take the difference between one array and a number of other arrays.
	  // Only the elements present in just the first array will remain.
	  _.difference = function(array) {
	    var rest = flatten(arguments, true, true, 1);
	    return _.filter(array, function(value){
	      return !_.contains(rest, value);
	    });
	  };

	  // Zip together multiple lists into a single array -- elements that share
	  // an index go together.
	  _.zip = function() {
	    return _.unzip(arguments);
	  };

	  // Complement of _.zip. Unzip accepts an array of arrays and groups
	  // each array's elements on shared indices
	  _.unzip = function(array) {
	    var length = array && _.max(array, getLength).length || 0;
	    var result = Array(length);

	    for (var index = 0; index < length; index++) {
	      result[index] = _.pluck(array, index);
	    }
	    return result;
	  };

	  // Converts lists into objects. Pass either a single array of `[key, value]`
	  // pairs, or two parallel arrays of the same length -- one of keys, and one of
	  // the corresponding values.
	  _.object = function(list, values) {
	    var result = {};
	    for (var i = 0, length = getLength(list); i < length; i++) {
	      if (values) {
	        result[list[i]] = values[i];
	      } else {
	        result[list[i][0]] = list[i][1];
	      }
	    }
	    return result;
	  };

	  // Generator function to create the findIndex and findLastIndex functions
	  function createPredicateIndexFinder(dir) {
	    return function(array, predicate, context) {
	      predicate = cb(predicate, context);
	      var length = getLength(array);
	      var index = dir > 0 ? 0 : length - 1;
	      for (; index >= 0 && index < length; index += dir) {
	        if (predicate(array[index], index, array)) return index;
	      }
	      return -1;
	    };
	  }

	  // Returns the first index on an array-like that passes a predicate test
	  _.findIndex = createPredicateIndexFinder(1);
	  _.findLastIndex = createPredicateIndexFinder(-1);

	  // Use a comparator function to figure out the smallest index at which
	  // an object should be inserted so as to maintain order. Uses binary search.
	  _.sortedIndex = function(array, obj, iteratee, context) {
	    iteratee = cb(iteratee, context, 1);
	    var value = iteratee(obj);
	    var low = 0, high = getLength(array);
	    while (low < high) {
	      var mid = Math.floor((low + high) / 2);
	      if (iteratee(array[mid]) < value) low = mid + 1; else high = mid;
	    }
	    return low;
	  };

	  // Generator function to create the indexOf and lastIndexOf functions
	  function createIndexFinder(dir, predicateFind, sortedIndex) {
	    return function(array, item, idx) {
	      var i = 0, length = getLength(array);
	      if (typeof idx == 'number') {
	        if (dir > 0) {
	            i = idx >= 0 ? idx : Math.max(idx + length, i);
	        } else {
	            length = idx >= 0 ? Math.min(idx + 1, length) : idx + length + 1;
	        }
	      } else if (sortedIndex && idx && length) {
	        idx = sortedIndex(array, item);
	        return array[idx] === item ? idx : -1;
	      }
	      if (item !== item) {
	        idx = predicateFind(slice.call(array, i, length), _.isNaN);
	        return idx >= 0 ? idx + i : -1;
	      }
	      for (idx = dir > 0 ? i : length - 1; idx >= 0 && idx < length; idx += dir) {
	        if (array[idx] === item) return idx;
	      }
	      return -1;
	    };
	  }

	  // Return the position of the first occurrence of an item in an array,
	  // or -1 if the item is not included in the array.
	  // If the array is large and already in sort order, pass `true`
	  // for **isSorted** to use binary search.
	  _.indexOf = createIndexFinder(1, _.findIndex, _.sortedIndex);
	  _.lastIndexOf = createIndexFinder(-1, _.findLastIndex);

	  // Generate an integer Array containing an arithmetic progression. A port of
	  // the native Python `range()` function. See
	  // [the Python documentation](http://docs.python.org/library/functions.html#range).
	  _.range = function(start, stop, step) {
	    if (stop == null) {
	      stop = start || 0;
	      start = 0;
	    }
	    step = step || 1;

	    var length = Math.max(Math.ceil((stop - start) / step), 0);
	    var range = Array(length);

	    for (var idx = 0; idx < length; idx++, start += step) {
	      range[idx] = start;
	    }

	    return range;
	  };

	  // Function (ahem) Functions
	  // ------------------

	  // Determines whether to execute a function as a constructor
	  // or a normal function with the provided arguments
	  var executeBound = function(sourceFunc, boundFunc, context, callingContext, args) {
	    if (!(callingContext instanceof boundFunc)) return sourceFunc.apply(context, args);
	    var self = baseCreate(sourceFunc.prototype);
	    var result = sourceFunc.apply(self, args);
	    if (_.isObject(result)) return result;
	    return self;
	  };

	  // Create a function bound to a given object (assigning `this`, and arguments,
	  // optionally). Delegates to **ECMAScript 5**'s native `Function.bind` if
	  // available.
	  _.bind = function(func, context) {
	    if (nativeBind && func.bind === nativeBind) return nativeBind.apply(func, slice.call(arguments, 1));
	    if (!_.isFunction(func)) throw new TypeError('Bind must be called on a function');
	    var args = slice.call(arguments, 2);
	    var bound = function() {
	      return executeBound(func, bound, context, this, args.concat(slice.call(arguments)));
	    };
	    return bound;
	  };

	  // Partially apply a function by creating a version that has had some of its
	  // arguments pre-filled, without changing its dynamic `this` context. _ acts
	  // as a placeholder, allowing any combination of arguments to be pre-filled.
	  _.partial = function(func) {
	    var boundArgs = slice.call(arguments, 1);
	    var bound = function() {
	      var position = 0, length = boundArgs.length;
	      var args = Array(length);
	      for (var i = 0; i < length; i++) {
	        args[i] = boundArgs[i] === _ ? arguments[position++] : boundArgs[i];
	      }
	      while (position < arguments.length) args.push(arguments[position++]);
	      return executeBound(func, bound, this, this, args);
	    };
	    return bound;
	  };

	  // Bind a number of an object's methods to that object. Remaining arguments
	  // are the method names to be bound. Useful for ensuring that all callbacks
	  // defined on an object belong to it.
	  _.bindAll = function(obj) {
	    var i, length = arguments.length, key;
	    if (length <= 1) throw new Error('bindAll must be passed function names');
	    for (i = 1; i < length; i++) {
	      key = arguments[i];
	      obj[key] = _.bind(obj[key], obj);
	    }
	    return obj;
	  };

	  // Memoize an expensive function by storing its results.
	  _.memoize = function(func, hasher) {
	    var memoize = function(key) {
	      var cache = memoize.cache;
	      var address = '' + (hasher ? hasher.apply(this, arguments) : key);
	      if (!_.has(cache, address)) cache[address] = func.apply(this, arguments);
	      return cache[address];
	    };
	    memoize.cache = {};
	    return memoize;
	  };

	  // Delays a function for the given number of milliseconds, and then calls
	  // it with the arguments supplied.
	  _.delay = function(func, wait) {
	    var args = slice.call(arguments, 2);
	    return setTimeout(function(){
	      return func.apply(null, args);
	    }, wait);
	  };

	  // Defers a function, scheduling it to run after the current call stack has
	  // cleared.
	  _.defer = _.partial(_.delay, _, 1);

	  // Returns a function, that, when invoked, will only be triggered at most once
	  // during a given window of time. Normally, the throttled function will run
	  // as much as it can, without ever going more than once per `wait` duration;
	  // but if you'd like to disable the execution on the leading edge, pass
	  // `{leading: false}`. To disable execution on the trailing edge, ditto.
	  _.throttle = function(func, wait, options) {
	    var context, args, result;
	    var timeout = null;
	    var previous = 0;
	    if (!options) options = {};
	    var later = function() {
	      previous = options.leading === false ? 0 : _.now();
	      timeout = null;
	      result = func.apply(context, args);
	      if (!timeout) context = args = null;
	    };
	    return function() {
	      var now = _.now();
	      if (!previous && options.leading === false) previous = now;
	      var remaining = wait - (now - previous);
	      context = this;
	      args = arguments;
	      if (remaining <= 0 || remaining > wait) {
	        if (timeout) {
	          clearTimeout(timeout);
	          timeout = null;
	        }
	        previous = now;
	        result = func.apply(context, args);
	        if (!timeout) context = args = null;
	      } else if (!timeout && options.trailing !== false) {
	        timeout = setTimeout(later, remaining);
	      }
	      return result;
	    };
	  };

	  // Returns a function, that, as long as it continues to be invoked, will not
	  // be triggered. The function will be called after it stops being called for
	  // N milliseconds. If `immediate` is passed, trigger the function on the
	  // leading edge, instead of the trailing.
	  _.debounce = function(func, wait, immediate) {
	    var timeout, args, context, timestamp, result;

	    var later = function() {
	      var last = _.now() - timestamp;

	      if (last < wait && last >= 0) {
	        timeout = setTimeout(later, wait - last);
	      } else {
	        timeout = null;
	        if (!immediate) {
	          result = func.apply(context, args);
	          if (!timeout) context = args = null;
	        }
	      }
	    };

	    return function() {
	      context = this;
	      args = arguments;
	      timestamp = _.now();
	      var callNow = immediate && !timeout;
	      if (!timeout) timeout = setTimeout(later, wait);
	      if (callNow) {
	        result = func.apply(context, args);
	        context = args = null;
	      }

	      return result;
	    };
	  };

	  // Returns the first function passed as an argument to the second,
	  // allowing you to adjust arguments, run code before and after, and
	  // conditionally execute the original function.
	  _.wrap = function(func, wrapper) {
	    return _.partial(wrapper, func);
	  };

	  // Returns a negated version of the passed-in predicate.
	  _.negate = function(predicate) {
	    return function() {
	      return !predicate.apply(this, arguments);
	    };
	  };

	  // Returns a function that is the composition of a list of functions, each
	  // consuming the return value of the function that follows.
	  _.compose = function() {
	    var args = arguments;
	    var start = args.length - 1;
	    return function() {
	      var i = start;
	      var result = args[start].apply(this, arguments);
	      while (i--) result = args[i].call(this, result);
	      return result;
	    };
	  };

	  // Returns a function that will only be executed on and after the Nth call.
	  _.after = function(times, func) {
	    return function() {
	      if (--times < 1) {
	        return func.apply(this, arguments);
	      }
	    };
	  };

	  // Returns a function that will only be executed up to (but not including) the Nth call.
	  _.before = function(times, func) {
	    var memo;
	    return function() {
	      if (--times > 0) {
	        memo = func.apply(this, arguments);
	      }
	      if (times <= 1) func = null;
	      return memo;
	    };
	  };

	  // Returns a function that will be executed at most one time, no matter how
	  // often you call it. Useful for lazy initialization.
	  _.once = _.partial(_.before, 2);

	  // Object Functions
	  // ----------------

	  // Keys in IE < 9 that won't be iterated by `for key in ...` and thus missed.
	  var hasEnumBug = !{toString: null}.propertyIsEnumerable('toString');
	  var nonEnumerableProps = ['valueOf', 'isPrototypeOf', 'toString',
	                      'propertyIsEnumerable', 'hasOwnProperty', 'toLocaleString'];

	  function collectNonEnumProps(obj, keys) {
	    var nonEnumIdx = nonEnumerableProps.length;
	    var constructor = obj.constructor;
	    var proto = (_.isFunction(constructor) && constructor.prototype) || ObjProto;

	    // Constructor is a special case.
	    var prop = 'constructor';
	    if (_.has(obj, prop) && !_.contains(keys, prop)) keys.push(prop);

	    while (nonEnumIdx--) {
	      prop = nonEnumerableProps[nonEnumIdx];
	      if (prop in obj && obj[prop] !== proto[prop] && !_.contains(keys, prop)) {
	        keys.push(prop);
	      }
	    }
	  }

	  // Retrieve the names of an object's own properties.
	  // Delegates to **ECMAScript 5**'s native `Object.keys`
	  _.keys = function(obj) {
	    if (!_.isObject(obj)) return [];
	    if (nativeKeys) return nativeKeys(obj);
	    var keys = [];
	    for (var key in obj) if (_.has(obj, key)) keys.push(key);
	    // Ahem, IE < 9.
	    if (hasEnumBug) collectNonEnumProps(obj, keys);
	    return keys;
	  };

	  // Retrieve all the property names of an object.
	  _.allKeys = function(obj) {
	    if (!_.isObject(obj)) return [];
	    var keys = [];
	    for (var key in obj) keys.push(key);
	    // Ahem, IE < 9.
	    if (hasEnumBug) collectNonEnumProps(obj, keys);
	    return keys;
	  };

	  // Retrieve the values of an object's properties.
	  _.values = function(obj) {
	    var keys = _.keys(obj);
	    var length = keys.length;
	    var values = Array(length);
	    for (var i = 0; i < length; i++) {
	      values[i] = obj[keys[i]];
	    }
	    return values;
	  };

	  // Returns the results of applying the iteratee to each element of the object
	  // In contrast to _.map it returns an object
	  _.mapObject = function(obj, iteratee, context) {
	    iteratee = cb(iteratee, context);
	    var keys =  _.keys(obj),
	          length = keys.length,
	          results = {},
	          currentKey;
	      for (var index = 0; index < length; index++) {
	        currentKey = keys[index];
	        results[currentKey] = iteratee(obj[currentKey], currentKey, obj);
	      }
	      return results;
	  };

	  // Convert an object into a list of `[key, value]` pairs.
	  _.pairs = function(obj) {
	    var keys = _.keys(obj);
	    var length = keys.length;
	    var pairs = Array(length);
	    for (var i = 0; i < length; i++) {
	      pairs[i] = [keys[i], obj[keys[i]]];
	    }
	    return pairs;
	  };

	  // Invert the keys and values of an object. The values must be serializable.
	  _.invert = function(obj) {
	    var result = {};
	    var keys = _.keys(obj);
	    for (var i = 0, length = keys.length; i < length; i++) {
	      result[obj[keys[i]]] = keys[i];
	    }
	    return result;
	  };

	  // Return a sorted list of the function names available on the object.
	  // Aliased as `methods`
	  _.functions = _.methods = function(obj) {
	    var names = [];
	    for (var key in obj) {
	      if (_.isFunction(obj[key])) names.push(key);
	    }
	    return names.sort();
	  };

	  // Extend a given object with all the properties in passed-in object(s).
	  _.extend = createAssigner(_.allKeys);

	  // Assigns a given object with all the own properties in the passed-in object(s)
	  // (https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object/assign)
	  _.extendOwn = _.assign = createAssigner(_.keys);

	  // Returns the first key on an object that passes a predicate test
	  _.findKey = function(obj, predicate, context) {
	    predicate = cb(predicate, context);
	    var keys = _.keys(obj), key;
	    for (var i = 0, length = keys.length; i < length; i++) {
	      key = keys[i];
	      if (predicate(obj[key], key, obj)) return key;
	    }
	  };

	  // Return a copy of the object only containing the whitelisted properties.
	  _.pick = function(object, oiteratee, context) {
	    var result = {}, obj = object, iteratee, keys;
	    if (obj == null) return result;
	    if (_.isFunction(oiteratee)) {
	      keys = _.allKeys(obj);
	      iteratee = optimizeCb(oiteratee, context);
	    } else {
	      keys = flatten(arguments, false, false, 1);
	      iteratee = function(value, key, obj) { return key in obj; };
	      obj = Object(obj);
	    }
	    for (var i = 0, length = keys.length; i < length; i++) {
	      var key = keys[i];
	      var value = obj[key];
	      if (iteratee(value, key, obj)) result[key] = value;
	    }
	    return result;
	  };

	   // Return a copy of the object without the blacklisted properties.
	  _.omit = function(obj, iteratee, context) {
	    if (_.isFunction(iteratee)) {
	      iteratee = _.negate(iteratee);
	    } else {
	      var keys = _.map(flatten(arguments, false, false, 1), String);
	      iteratee = function(value, key) {
	        return !_.contains(keys, key);
	      };
	    }
	    return _.pick(obj, iteratee, context);
	  };

	  // Fill in a given object with default properties.
	  _.defaults = createAssigner(_.allKeys, true);

	  // Creates an object that inherits from the given prototype object.
	  // If additional properties are provided then they will be added to the
	  // created object.
	  _.create = function(prototype, props) {
	    var result = baseCreate(prototype);
	    if (props) _.extendOwn(result, props);
	    return result;
	  };

	  // Create a (shallow-cloned) duplicate of an object.
	  _.clone = function(obj) {
	    if (!_.isObject(obj)) return obj;
	    return _.isArray(obj) ? obj.slice() : _.extend({}, obj);
	  };

	  // Invokes interceptor with the obj, and then returns obj.
	  // The primary purpose of this method is to "tap into" a method chain, in
	  // order to perform operations on intermediate results within the chain.
	  _.tap = function(obj, interceptor) {
	    interceptor(obj);
	    return obj;
	  };

	  // Returns whether an object has a given set of `key:value` pairs.
	  _.isMatch = function(object, attrs) {
	    var keys = _.keys(attrs), length = keys.length;
	    if (object == null) return !length;
	    var obj = Object(object);
	    for (var i = 0; i < length; i++) {
	      var key = keys[i];
	      if (attrs[key] !== obj[key] || !(key in obj)) return false;
	    }
	    return true;
	  };


	  // Internal recursive comparison function for `isEqual`.
	  var eq = function(a, b, aStack, bStack) {
	    // Identical objects are equal. `0 === -0`, but they aren't identical.
	    // See the [Harmony `egal` proposal](http://wiki.ecmascript.org/doku.php?id=harmony:egal).
	    if (a === b) return a !== 0 || 1 / a === 1 / b;
	    // A strict comparison is necessary because `null == undefined`.
	    if (a == null || b == null) return a === b;
	    // Unwrap any wrapped objects.
	    if (a instanceof _) a = a._wrapped;
	    if (b instanceof _) b = b._wrapped;
	    // Compare `[[Class]]` names.
	    var className = toString.call(a);
	    if (className !== toString.call(b)) return false;
	    switch (className) {
	      // Strings, numbers, regular expressions, dates, and booleans are compared by value.
	      case '[object RegExp]':
	      // RegExps are coerced to strings for comparison (Note: '' + /a/i === '/a/i')
	      case '[object String]':
	        // Primitives and their corresponding object wrappers are equivalent; thus, `"5"` is
	        // equivalent to `new String("5")`.
	        return '' + a === '' + b;
	      case '[object Number]':
	        // `NaN`s are equivalent, but non-reflexive.
	        // Object(NaN) is equivalent to NaN
	        if (+a !== +a) return +b !== +b;
	        // An `egal` comparison is performed for other numeric values.
	        return +a === 0 ? 1 / +a === 1 / b : +a === +b;
	      case '[object Date]':
	      case '[object Boolean]':
	        // Coerce dates and booleans to numeric primitive values. Dates are compared by their
	        // millisecond representations. Note that invalid dates with millisecond representations
	        // of `NaN` are not equivalent.
	        return +a === +b;
	    }

	    var areArrays = className === '[object Array]';
	    if (!areArrays) {
	      if (typeof a != 'object' || typeof b != 'object') return false;

	      // Objects with different constructors are not equivalent, but `Object`s or `Array`s
	      // from different frames are.
	      var aCtor = a.constructor, bCtor = b.constructor;
	      if (aCtor !== bCtor && !(_.isFunction(aCtor) && aCtor instanceof aCtor &&
	                               _.isFunction(bCtor) && bCtor instanceof bCtor)
	                          && ('constructor' in a && 'constructor' in b)) {
	        return false;
	      }
	    }
	    // Assume equality for cyclic structures. The algorithm for detecting cyclic
	    // structures is adapted from ES 5.1 section 15.12.3, abstract operation `JO`.

	    // Initializing stack of traversed objects.
	    // It's done here since we only need them for objects and arrays comparison.
	    aStack = aStack || [];
	    bStack = bStack || [];
	    var length = aStack.length;
	    while (length--) {
	      // Linear search. Performance is inversely proportional to the number of
	      // unique nested structures.
	      if (aStack[length] === a) return bStack[length] === b;
	    }

	    // Add the first object to the stack of traversed objects.
	    aStack.push(a);
	    bStack.push(b);

	    // Recursively compare objects and arrays.
	    if (areArrays) {
	      // Compare array lengths to determine if a deep comparison is necessary.
	      length = a.length;
	      if (length !== b.length) return false;
	      // Deep compare the contents, ignoring non-numeric properties.
	      while (length--) {
	        if (!eq(a[length], b[length], aStack, bStack)) return false;
	      }
	    } else {
	      // Deep compare objects.
	      var keys = _.keys(a), key;
	      length = keys.length;
	      // Ensure that both objects contain the same number of properties before comparing deep equality.
	      if (_.keys(b).length !== length) return false;
	      while (length--) {
	        // Deep compare each member
	        key = keys[length];
	        if (!(_.has(b, key) && eq(a[key], b[key], aStack, bStack))) return false;
	      }
	    }
	    // Remove the first object from the stack of traversed objects.
	    aStack.pop();
	    bStack.pop();
	    return true;
	  };

	  // Perform a deep comparison to check if two objects are equal.
	  _.isEqual = function(a, b) {
	    return eq(a, b);
	  };

	  // Is a given array, string, or object empty?
	  // An "empty" object has no enumerable own-properties.
	  _.isEmpty = function(obj) {
	    if (obj == null) return true;
	    if (isArrayLike(obj) && (_.isArray(obj) || _.isString(obj) || _.isArguments(obj))) return obj.length === 0;
	    return _.keys(obj).length === 0;
	  };

	  // Is a given value a DOM element?
	  _.isElement = function(obj) {
	    return !!(obj && obj.nodeType === 1);
	  };

	  // Is a given value an array?
	  // Delegates to ECMA5's native Array.isArray
	  _.isArray = nativeIsArray || function(obj) {
	    return toString.call(obj) === '[object Array]';
	  };

	  // Is a given variable an object?
	  _.isObject = function(obj) {
	    var type = typeof obj;
	    return type === 'function' || type === 'object' && !!obj;
	  };

	  // Add some isType methods: isArguments, isFunction, isString, isNumber, isDate, isRegExp, isError.
	  _.each(['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp', 'Error'], function(name) {
	    _['is' + name] = function(obj) {
	      return toString.call(obj) === '[object ' + name + ']';
	    };
	  });

	  // Define a fallback version of the method in browsers (ahem, IE < 9), where
	  // there isn't any inspectable "Arguments" type.
	  if (!_.isArguments(arguments)) {
	    _.isArguments = function(obj) {
	      return _.has(obj, 'callee');
	    };
	  }

	  // Optimize `isFunction` if appropriate. Work around some typeof bugs in old v8,
	  // IE 11 (#1621), and in Safari 8 (#1929).
	  if (typeof /./ != 'function' && typeof Int8Array != 'object') {
	    _.isFunction = function(obj) {
	      return typeof obj == 'function' || false;
	    };
	  }

	  // Is a given object a finite number?
	  _.isFinite = function(obj) {
	    return isFinite(obj) && !isNaN(parseFloat(obj));
	  };

	  // Is the given value `NaN`? (NaN is the only number which does not equal itself).
	  _.isNaN = function(obj) {
	    return _.isNumber(obj) && obj !== +obj;
	  };

	  // Is a given value a boolean?
	  _.isBoolean = function(obj) {
	    return obj === true || obj === false || toString.call(obj) === '[object Boolean]';
	  };

	  // Is a given value equal to null?
	  _.isNull = function(obj) {
	    return obj === null;
	  };

	  // Is a given variable undefined?
	  _.isUndefined = function(obj) {
	    return obj === void 0;
	  };

	  // Shortcut function for checking if an object has a given property directly
	  // on itself (in other words, not on a prototype).
	  _.has = function(obj, key) {
	    return obj != null && hasOwnProperty.call(obj, key);
	  };

	  // Utility Functions
	  // -----------------

	  // Run Underscore.js in *noConflict* mode, returning the `_` variable to its
	  // previous owner. Returns a reference to the Underscore object.
	  _.noConflict = function() {
	    root._ = previousUnderscore;
	    return this;
	  };

	  // Keep the identity function around for default iteratees.
	  _.identity = function(value) {
	    return value;
	  };

	  // Predicate-generating functions. Often useful outside of Underscore.
	  _.constant = function(value) {
	    return function() {
	      return value;
	    };
	  };

	  _.noop = function(){};

	  _.property = property;

	  // Generates a function for a given object that returns a given property.
	  _.propertyOf = function(obj) {
	    return obj == null ? function(){} : function(key) {
	      return obj[key];
	    };
	  };

	  // Returns a predicate for checking whether an object has a given set of
	  // `key:value` pairs.
	  _.matcher = _.matches = function(attrs) {
	    attrs = _.extendOwn({}, attrs);
	    return function(obj) {
	      return _.isMatch(obj, attrs);
	    };
	  };

	  // Run a function **n** times.
	  _.times = function(n, iteratee, context) {
	    var accum = Array(Math.max(0, n));
	    iteratee = optimizeCb(iteratee, context, 1);
	    for (var i = 0; i < n; i++) accum[i] = iteratee(i);
	    return accum;
	  };

	  // Return a random integer between min and max (inclusive).
	  _.random = function(min, max) {
	    if (max == null) {
	      max = min;
	      min = 0;
	    }
	    return min + Math.floor(Math.random() * (max - min + 1));
	  };

	  // A (possibly faster) way to get the current timestamp as an integer.
	  _.now = Date.now || function() {
	    return new Date().getTime();
	  };

	   // List of HTML entities for escaping.
	  var escapeMap = {
	    '&': '&amp;',
	    '<': '&lt;',
	    '>': '&gt;',
	    '"': '&quot;',
	    "'": '&#x27;',
	    '`': '&#x60;'
	  };
	  var unescapeMap = _.invert(escapeMap);

	  // Functions for escaping and unescaping strings to/from HTML interpolation.
	  var createEscaper = function(map) {
	    var escaper = function(match) {
	      return map[match];
	    };
	    // Regexes for identifying a key that needs to be escaped
	    var source = '(?:' + _.keys(map).join('|') + ')';
	    var testRegexp = RegExp(source);
	    var replaceRegexp = RegExp(source, 'g');
	    return function(string) {
	      string = string == null ? '' : '' + string;
	      return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
	    };
	  };
	  _.escape = createEscaper(escapeMap);
	  _.unescape = createEscaper(unescapeMap);

	  // If the value of the named `property` is a function then invoke it with the
	  // `object` as context; otherwise, return it.
	  _.result = function(object, property, fallback) {
	    var value = object == null ? void 0 : object[property];
	    if (value === void 0) {
	      value = fallback;
	    }
	    return _.isFunction(value) ? value.call(object) : value;
	  };

	  // Generate a unique integer id (unique within the entire client session).
	  // Useful for temporary DOM ids.
	  var idCounter = 0;
	  _.uniqueId = function(prefix) {
	    var id = ++idCounter + '';
	    return prefix ? prefix + id : id;
	  };

	  // By default, Underscore uses ERB-style template delimiters, change the
	  // following template settings to use alternative delimiters.
	  _.templateSettings = {
	    evaluate    : /<%([\s\S]+?)%>/g,
	    interpolate : /<%=([\s\S]+?)%>/g,
	    escape      : /<%-([\s\S]+?)%>/g
	  };

	  // When customizing `templateSettings`, if you don't want to define an
	  // interpolation, evaluation or escaping regex, we need one that is
	  // guaranteed not to match.
	  var noMatch = /(.)^/;

	  // Certain characters need to be escaped so that they can be put into a
	  // string literal.
	  var escapes = {
	    "'":      "'",
	    '\\':     '\\',
	    '\r':     'r',
	    '\n':     'n',
	    '\u2028': 'u2028',
	    '\u2029': 'u2029'
	  };

	  var escaper = /\\|'|\r|\n|\u2028|\u2029/g;

	  var escapeChar = function(match) {
	    return '\\' + escapes[match];
	  };

	  // JavaScript micro-templating, similar to John Resig's implementation.
	  // Underscore templating handles arbitrary delimiters, preserves whitespace,
	  // and correctly escapes quotes within interpolated code.
	  // NB: `oldSettings` only exists for backwards compatibility.
	  _.template = function(text, settings, oldSettings) {
	    if (!settings && oldSettings) settings = oldSettings;
	    settings = _.defaults({}, settings, _.templateSettings);

	    // Combine delimiters into one regular expression via alternation.
	    var matcher = RegExp([
	      (settings.escape || noMatch).source,
	      (settings.interpolate || noMatch).source,
	      (settings.evaluate || noMatch).source
	    ].join('|') + '|$', 'g');

	    // Compile the template source, escaping string literals appropriately.
	    var index = 0;
	    var source = "__p+='";
	    text.replace(matcher, function(match, escape, interpolate, evaluate, offset) {
	      source += text.slice(index, offset).replace(escaper, escapeChar);
	      index = offset + match.length;

	      if (escape) {
	        source += "'+\n((__t=(" + escape + "))==null?'':_.escape(__t))+\n'";
	      } else if (interpolate) {
	        source += "'+\n((__t=(" + interpolate + "))==null?'':__t)+\n'";
	      } else if (evaluate) {
	        source += "';\n" + evaluate + "\n__p+='";
	      }

	      // Adobe VMs need the match returned to produce the correct offest.
	      return match;
	    });
	    source += "';\n";

	    // If a variable is not specified, place data values in local scope.
	    if (!settings.variable) source = 'with(obj||{}){\n' + source + '}\n';

	    source = "var __t,__p='',__j=Array.prototype.join," +
	      "print=function(){__p+=__j.call(arguments,'');};\n" +
	      source + 'return __p;\n';

	    try {
	      var render = new Function(settings.variable || 'obj', '_', source);
	    } catch (e) {
	      e.source = source;
	      throw e;
	    }

	    var template = function(data) {
	      return render.call(this, data, _);
	    };

	    // Provide the compiled source as a convenience for precompilation.
	    var argument = settings.variable || 'obj';
	    template.source = 'function(' + argument + '){\n' + source + '}';

	    return template;
	  };

	  // Add a "chain" function. Start chaining a wrapped Underscore object.
	  _.chain = function(obj) {
	    var instance = _(obj);
	    instance._chain = true;
	    return instance;
	  };

	  // OOP
	  // ---------------
	  // If Underscore is called as a function, it returns a wrapped object that
	  // can be used OO-style. This wrapper holds altered versions of all the
	  // underscore functions. Wrapped objects may be chained.

	  // Helper function to continue chaining intermediate results.
	  var result = function(instance, obj) {
	    return instance._chain ? _(obj).chain() : obj;
	  };

	  // Add your own custom functions to the Underscore object.
	  _.mixin = function(obj) {
	    _.each(_.functions(obj), function(name) {
	      var func = _[name] = obj[name];
	      _.prototype[name] = function() {
	        var args = [this._wrapped];
	        push.apply(args, arguments);
	        return result(this, func.apply(_, args));
	      };
	    });
	  };

	  // Add all of the Underscore functions to the wrapper object.
	  _.mixin(_);

	  // Add all mutator Array functions to the wrapper.
	  _.each(['pop', 'push', 'reverse', 'shift', 'sort', 'splice', 'unshift'], function(name) {
	    var method = ArrayProto[name];
	    _.prototype[name] = function() {
	      var obj = this._wrapped;
	      method.apply(obj, arguments);
	      if ((name === 'shift' || name === 'splice') && obj.length === 0) delete obj[0];
	      return result(this, obj);
	    };
	  });

	  // Add all accessor Array functions to the wrapper.
	  _.each(['concat', 'join', 'slice'], function(name) {
	    var method = ArrayProto[name];
	    _.prototype[name] = function() {
	      return result(this, method.apply(this._wrapped, arguments));
	    };
	  });

	  // Extracts the result from a wrapped and chained object.
	  _.prototype.value = function() {
	    return this._wrapped;
	  };

	  // Provide unwrapping proxy for some methods used in engine operations
	  // such as arithmetic and JSON stringification.
	  _.prototype.valueOf = _.prototype.toJSON = _.prototype.value;

	  _.prototype.toString = function() {
	    return '' + this._wrapped;
	  };

	  // AMD registration happens at the end for compatibility with AMD loaders
	  // that may not enforce next-turn semantics on modules. Even though general
	  // practice for AMD registration is to be anonymous, underscore registers
	  // as a named module because, like jQuery, it is a base library that is
	  // popular enough to be bundled in a third party lib, but not be part of
	  // an AMD load request. Those cases could generate an error when an
	  // anonymous define() is called outside of a loader request.
	  if (true) {
	    !(__WEBPACK_AMD_DEFINE_ARRAY__ = [], __WEBPACK_AMD_DEFINE_RESULT__ = function() {
	      return _;
	    }.apply(exports, __WEBPACK_AMD_DEFINE_ARRAY__), __WEBPACK_AMD_DEFINE_RESULT__ !== undefined && (module.exports = __WEBPACK_AMD_DEFINE_RESULT__));
	  }
	}.call(this));


/***/ },
/* 7 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});
	exports.and = and;
	exports.or = or;
	exports.not = not;
	/**
	 * Concurrent logic utils
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 */

	/**
	 * Identity function, returns what it gets.
	 *
	 * @param {?} i - What it gets.
	 * @returns {?} What it got.
	 */
	const identity = i => i;

	/**
	 * An asynchronous version of the boolean and operation.
	 *
	 * @param {Promise} args - Promises that return booleans to do an and on.
	 * @async
	 * @returns {boolean} Result of the and operation on all returned values.
	 */
	function and(...args) {
	  return Promise.all(args).then(p => p.every(i));
	};

	/**
	 * An asynchronous version of the boolean or operation.
	 *
	 * @param {Promise} args - Promises that return booleans to do an or on.
	 * @async
	 * @returns {boolean} Result of the or operation on all returned values.
	 */
	function or(...args) {
	  return Promise.all(args).then(p => p.some(i));
	};

	/*
	 * Invert the value a promise resolves to.
	 *
	 * @param {Promise} promsie - Promise that returns the value to invert.
	 * @async
	 * @returns {boolean} The opposite value than the given promise resolved to.
	 */
	function not(promise) {
	  return promise.then(p => !p);
	};

/***/ },
/* 8 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	/**
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module channel/utils
	 */

	/**
	 * Opens the given channel in a new tab, unless there is already a tab open for
	 * it.
	 *
	 * @param {module:channel/core.Channel} channel - The channel to open.
	 * @param {string} [what] - Specifies the action to take. "chat" opens the
	 *         channel's chat, "archive" opens the archive.
	 * @returns {number?} The channel should now be visible for the user.
	 */
	let selectOrOpenTab = exports.selectOrOpenTab = (() => {
	    var _ref = _asyncToGenerator(function* (channel, what) {
	        let toCheck = [];

	        if (what === "chat") {
	            toCheck.push(channel.chatUrl);
	        } else if (what === "archive" || !channel.live.isLive()) {
	            toCheck.push(channel.archiveUrl);
	        } else {
	            toCheck = channel.url;

	            if (what === "livestreamer") {
	                throw "Not supported";
	            }
	        }

	        const tabs = yield browser.tabs.query({
	            url: toCheck
	        });
	        if (tabs.length) {
	            return browser.tabs.update(tabs[0].id, {
	                active: true
	            });
	        }
	        // There's no tab open for the channel
	        return browser.tabs.create({ url: toCheck[0] });
	    });

	    return function selectOrOpenTab(_x, _x2) {
	        return _ref.apply(this, arguments);
	    };
	})();

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _providers = __webpack_require__(10);

	var _providers2 = _interopRequireDefault(_providers);

	var _manager = __webpack_require__(37);

	var _manager2 = _interopRequireDefault(_manager);

	var _list = __webpack_require__(38);

	var _list2 = _interopRequireDefault(_list);

	var _utils = __webpack_require__(4);

	var _serialized = __webpack_require__(39);

	var _serialized2 = _interopRequireDefault(_serialized);

	var _parentalControls = __webpack_require__(16);

	var _parentalControls2 = _interopRequireDefault(_parentalControls);

	var _underscore = __webpack_require__(6);

	var _dump = __webpack_require__(40);

	var debugDump = _interopRequireWildcard(_dump);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _logins = __webpack_require__(41);

	var logins = _interopRequireWildcard(_logins);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module channel/controller
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */
	//TODO

	//import EventSink from '../providers/events'; //TODO replace with giving a special channel list to providers? Makes them more than just data providers. Not sure how to get the events from channel list in there though.


	/**
	 * @event module:channel/controller.ChannelController#channelsadded
	 * @type {Array.<module:channel/core.Channel>}
	 */
	/**
	 * @event module:channel/controller.ChannelController#channeldeleted
	 * @type {number}
	 */
	/**
	 * @event module:channel/controller.ChannelController#channelupdated
	 * @type {module:channel/core.Channel}
	 */

	const REFRESH_PROFILE_URL = "https://support.mozilla.org/kb/refresh-firefox-reset-add-ons-and-settings",

	/**
	 * Filters mature channels if parental controls are activated.
	 *
	 * @param {Array.<module:channel/core.Channel>} channels
	 * @returns {Array.<module:channel/core.Channel>} Filtered of channels marked as
	 *         mature if parental controls are activated.
	 */
	filterInapropriateChannels = channels => {
	    if (_parentalControls2.default.enabled) {
	        return channels.filter(c => !c.mature);
	    } else {
	        return channels;
	    }
	},
	      searchCredentials = url => logins.search({ url }),
	      filterExistingFavs = (user, channels) => channels.filter(ch => !user.favorites.includes(ch.login));

	/**
	 * Controller for all the channel stuff. Handles getting info from providers
	 * and abstracts the {@link module:channel/list.ChannelList} complications away.
	 * @extends external:EventTarget
	 */
	class ChannelController extends EventTarget {

	    /**
	     * @fires module:channel/controller.ChannelController#channelsadded
	     * @fires module:channel/controller.ChannelController#channeldeleted
	     * @fires module:channel/controller.ChannelController#channelupdated
	     */
	    constructor() {
	        super();
	        /**
	         * @type {Array.<function>}
	         * @private
	         */
	        this._ready = false;
	        this._queue = [];

	        const managerError = (name, type, itemType, canceled = () => false) => {
	            if (canceled()) {
	                this._manager.onCancel(name, type, itemType);
	            } else if (name && type in _providers2.default) {
	                this._manager.onError(name, _providers2.default[type].name, itemType);
	            } else {
	                this._manager.onError();
	            }
	        },
	              managerDoneLoading = () => {
	            this._manager.loading = false;
	        };
	        /**
	         * @type module:channel/manager.ChannelsManager
	         * @private
	         */
	        this._manager = new _manager2.default();
	        this._manager.addEventListener("addchannel", ({ detail: [name, type, canceled] }) => this.addChannel(name, type, canceled).then(() => this._manager._deleteCancelingValue("channel", type, name), () => managerError(name, type, "channel", canceled)));
	        this._manager.addEventListener("removechannel", ({ detail }) => this.removeChannel(detail));
	        this._manager.addEventListener("updatechannel", ({ detail }) => this.updateChannel(detail).catch(managerDoneLoading));
	        this._manager.addEventListener("adduser", ({ detail: [username, type, canceled] }) => this.addUser(username, type, canceled).then(() => this._manager._deleteCancelingValue("user", type, username), () => managerError(username, type, "user", canceled)));
	        this._manager.addEventListener("removeuser", ({ detail }) => this.removeUser(detail));
	        this._manager.addEventListener("updatefavorites", ({ detail }) => this.updateUser(detail).catch(managerDoneLoading));
	        this._manager.addEventListener("autoadd", () => this.autoAddUsers().catch(managerDoneLoading));
	        this._manager.addEventListener("getdata", () => {
	            Promise.all([this.getChannelsByType().then(channels => channels.forEach(ch => this._manager.onChannelAdded(ch))), this.getUsersByType().then(users => users.forEach(usr => this._manager.onUserAdded(usr)))]).then(managerDoneLoading, managerDoneLoading);

	            this._manager.addProviders(_serialized2.default);
	        });
	        this._manager.addEventListener("debugdump", () => {
	            Promise.all([this.getChannelsByType(), this.getUsersByType()]).then(([channels, users]) => {
	                return debugDump.copy(channels, users);
	            });
	        });
	        this._manager.addEventListener("showoptions", () => {
	            _preferences2.default.open();
	        });

	        /*
	         * These are a bunch of helpers for onChanneldelted. The comment there
	         * explains more or less what's going on.
	         */
	        const deletedTypes = new Map(),

	        // We only want the afterchannelsdeleted event to fire after all channels are gone.
	        debouncedEvent = (0, _underscore.debounce)(() => (0, _utils.emit)(this, "afterchannelsdeleted"), 500),
	              deleteCallback = type => {
	            this._list.getChannelsByType(type).then(channels => {
	                if (channels.length > 0 && _providers2.default[type].enabled) {
	                    _providers2.default[type].updateRequest(channels);
	                } else {
	                    _providers2.default[type].removeRequest();
	                }
	                deletedTypes.delete(type);
	                debouncedEvent();
	            });
	        };
	        /**
	         * @type module:channel/list.ChannelList
	         * @private
	         */
	        this._list = new _list2.default();
	        this._list.addEventListener("ready", () => {
	            this._ready = true;

	            // Resolve all the queued up promises.
	            this._queue.forEach(r => r());
	            this._queue.length = 0;
	        });
	        this._list.addEventListener("channelsadded", ({ detail: channels }) => {
	            // Assume we always only get an array of channels with the same type.
	            if (_providers2.default[channels[0].type].enabled) {
	                this._list.getChannelsByType(channels[0].type).then(chans => {
	                    _providers2.default[chans[0].type].updateRequest(chans);
	                });
	            }

	            channels.forEach(chan => this._manager.onChannelAdded(chan));

	            (0, _utils.emit)(this, "channelsadded", channels);
	        });
	        this._list.addEventListener("useradded", ({ detail: user }) => {
	            if (_providers2.default[user.type].supports.favorites) {
	                this._list.getUsersByType(user.type).then(users => {
	                    _providers2.default[user.type].updateFavsRequest(users);
	                });
	            }

	            this._manager.onUserAdded(user);
	        });
	        this._list.addEventListener("beforechanneldeleted", ({ detail }) => {
	            (0, _utils.emit)(this, "beforechanneldeleted", detail);
	        });
	        this._list.addEventListener("channeldeleted", ({ detail: channel }) => {
	            /*
	             * Yeah, this is a bit confusing, but that's why there are
	             * comments explaining it. So sometimes multiple channels get
	             * deleted at once - the channels manager supports multi-selects
	             * But they aren't of the same type. So what we want to do, is
	             * call the unqueueRequest() for each provider exactly once.
	             * To do so, we have to make sure, it only gets called for the
	             * last deleted channel of a type. invokeOnce makes sure only
	             * when the last "invoker" of invokeOnce is calling it, the
	             * method gets executed. Since we have multiple types, there is
	             * a map, storing the callback invokeOnce calls for each type.
	             * And that's all there is to it. Just to reduce requeueing
	             * stuff. Now why should only the last one get invoked?
	             * Because getChannelsByType is async, and in the worst case,
	             * the one without channels to return returns first, which means
	             * an update requests with channels that were deleted would be
	             * queued, which would lead to them being readded to the list.
	             * So this is all totally needed, especially the length of this
	             * very comment is crucial to the operation. For more long
	             * comments, explaining stuff, check out the lib/utils module,
	             * where invokeOnce is kind of explained.
	             */
	            if (!deletedTypes.has(channel.type)) {
	                deletedTypes.set(channel.type, (0, _underscore.partial)(deleteCallback, channel.type));
	            }
	            (0, _utils.invokeOnce)(channel.id, deletedTypes.get(channel.type));

	            this._manager.onChannelRemoved(channel.id);

	            (0, _utils.emit)(this, "channeldeleted", channel.id);
	        });
	        this._list.addEventListener("userdeleted", ({ detail: user }) => {
	            /* not doing the same mass deletion stuff as for channels, as I
	               assume there are less users and it'd mess up the queue's pausing,
	               if a user is removed because a channel was deleted.
	             */
	            if (_providers2.default[user.type].supports.favorites) {
	                this._list.getUsersByType(user.type).then(users => {
	                    if (users.length > 0) {
	                        _providers2.default[user.type].updateFavsRequest(users);
	                    } else {
	                        _providers2.default[user.type].removeFavsRequest();
	                    }
	                });
	            }

	            this._manager.onUserRemoved(user.id);
	        });
	        this._list.addEventListener("channelupdated", ({ detail: channel }) => {
	            this._manager.onChannelUpdated(channel);

	            (0, _utils.emit)(this, "channelupdated", channel);
	        });
	        this._list.addEventListener("userupdated", ({ detail }) => {
	            this._manager.onUserUpdated(detail);
	        });
	        this._list.addEventListener("clear", ({ detail: hard }) => {
	            if (hard) {
	                //TODO swap out the panel and warning state on the button
	                showNotificationBox({
	                    value: "jtvn-dberased",
	                    label: _("lost_channels"),
	                    priority: "WARNING_HIGH",
	                    persistence: 10,
	                    image: self.data.url("./icon18.png"),
	                    buttons: [{
	                        label: _("manageChannels_label"),
	                        onClick: () => this.showManager()
	                    }]
	                });
	            }
	        });
	        this._list.addEventListener("unfixableerror", () => {
	            //TODO swap out panel and add warning state to button
	            showNotificationBox({
	                value: "jtvn-restorefailed",
	                label: _("restore_failed"),
	                priority: "CRITICAL_LOW",
	                persistence: 10,
	                image: self.data.url("./offline18.png"),
	                buttons: [{
	                    label: _("restore_action"),
	                    onClick: () => tabs.open({ url: REFRESH_PROFILE_URL })
	                }]
	            });
	        });
	        // Provider update events

	        /**
	         * @type module:providers/events.EventSink
	         * @private
	         */
	        /*this._eventSink = new EventSink();
	        this._eventSink.addEventListener("updateduser", ({ detail }) => {
	            this._list.setUser(detail);
	        });
	        this._eventSink.addEventListener("newchannels", ({ detail: channels }) => {
	            channels = filterInapropriateChannels(channels);
	            if(channels.length > 0) {
	                this._list.addChannels(channels);
	            }
	        });
	        this._eventSink.addEventListener("updatedchannels", ({ detail: channels }) => {
	            if(Array.isArray(channels)) {
	                channels.forEach((channel) => this._list.setChannel(channel).catch(() => this._list.addChannel(channel)));
	            }
	            else {
	                this._list.setChannel(channels).catch(() => this._list.addChannel(channels));
	            }
	        });*/

	        const channelsCb = channels => {
	            if (channels.length) {
	                _providers2.default[channels[0].type].updateRequest(channels);
	            }
	        },
	              usersCb = users => {
	            if (users.length) {
	                _providers2.default[users[0].type].updateFavsRequest(users);
	            }
	        };

	        for (let p in _providers2.default) {
	            if (_providers2.default[p].enabled) {
	                this.getChannelsByType(p).then(channelsCb);
	                if (_providers2.default[p].supports.favorites) {
	                    this.getUsersByType(p).then(usersCb);
	                }
	            }
	        }
	    }
	    /**
	     * Returns a promise that resolves as soon as the ChannelList is ready.
	     * Another method in this module that makes magic happen...
	     * The promise is resolved with all the arguments this method was called.
	     *
	     * @param {?} args
	     * @async
	     * @private
	     */

	    /**
	     * @type {boolean}
	     * @private
	     */
	    _ensureQueueReady(...args) {
	        if (!this._ready) {
	            return new Promise(resolve => this._queue.push((0, _underscore.partial)(resolve, ...args)));
	        } else {
	            return Promise.resolve(...args);
	        }
	    }
	    /**
	     * Get the details of a channel and store them in the ChannelList.
	     *
	     * @param {string} name
	     * @param {string} type
	     * @param {Funtion} [canceled=() => false]
	     * @returns {module:channel/core.Channel}
	     */
	    addChannel(name, type, canceled = () => false) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            if (type in _providers2.default && _providers2.default[type].enabled) {
	                const channel = yield _providers2.default[type].getChannelDetails(name);
	                if (_parentalControls2.default.enabled && channel.mature) {
	                    throw "Not allowed to add this channel";
	                }

	                yield _this._ensureQueueReady();

	                if (canceled()) {
	                    throw "Canceled";
	                }

	                return _this._list.addChannel(channel);
	            } else {
	                throw "Provider is disabled";
	            }
	        })();
	    }
	    /**
	     * Update a channel and store it in the ChannelList.
	     *
	     * @param {number} channelId
	     * @returns {module:channel/core.Channel?}
	     */
	    updateChannel(channelId) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            yield _this2._ensureQueueReady();
	            let channel = yield _this2._list.getChannel(channelId);
	            if (!_providers2.default[channel.type].enabled) {
	                return null;
	            }

	            channel = yield _providers2.default[channel.type].updateChannel(channel.login);
	            return _this2._list.setChannel(channel);
	        })();
	    }
	    /**
	     * Update channels by provider. Doesn't update if the provider is disabled.
	     *
	     * @param {string} [provider=null] - Type of channels to update. All
	     *                                        channels are updated if left out.
	     * @returns {Array.<module:channel/core.Channel>|module:channel/core.Channel}
	     */
	    updateChannels(provider = null) {
	        var _this3 = this;

	        return _asyncToGenerator(function* () {
	            if (provider === null || !(provider in _providers2.default)) {
	                return Promise.all(Object.keys(_providers2.default).filter(function (p) {
	                    return _providers2.default[p].enabled;
	                }).map(_this3.updateChannels.bind(_this3)));
	            } else if (_providers2.default[provider].enabled) {
	                yield _this3._ensureQueueReady();
	                let channels = yield _this3._list.getChannelsByType(provider);

	                if (channels.length) {
	                    channels = yield _providers2.default[provider].updateChannels(channels);
	                }

	                if (Array.isArray(channels)) {
	                    return Promise.all(channels.map(_this3._list.setChannel.bind(_this3._list)));
	                } else {
	                    return _this3._list.setChannel(channels);
	                }
	            } else {
	                return [];
	            }
	        })();
	    }
	    /**
	     * Get a channel.
	     *
	     * @param {number} channelId - ID of the channel.
	     * @returns {module:channel/core.Channel}
	     * @async
	     */
	    getChannel(channelId) {
	        return this._ensureQueueReady().then(() => this._list.getChannel(channelId));
	    }
	    /**
	     * Get multiple channels by provider.
	     *
	     * @param {string} [provider=null] - Type of the channels to return. If
	     *                                      left out, all channels are returned.
	     * @returns {Array.<module:channel/core.Channel>}
	     * @async
	     */
	    getChannelsByType(provider = null) {
	        return this._ensureQueueReady().then(() => this._list.getChannelsByType(provider));
	    }
	    /**
	     * Remove a channel from the ChannelList.
	     *
	     * @param {number} channelId
	     * @returns {module:channel/core.Channel}
	     * @async
	     */
	    removeChannel(channelId) {
	        return this._ensureQueueReady().then(() => this._list.removeChannel(channelId));
	    }
	    /**
	     * Add a user and its favorites.
	     *
	     * @param {string} username
	     * @param {string} type
	     * @param {Function} [canceled=() => false]
	     * @returns {module:channel/core.User} An array with the added user and an array of added
	     *                 channels.
	     * @throws Gets rejected if the provider doesn't support favorites.
	     */
	    addUser(username, type, canceled = () => false) {
	        var _this4 = this;

	        return _asyncToGenerator(function* () {
	            if (type in _providers2.default && _providers2.default[type].supports.favorites) {
	                let [user, channels] = yield _providers2.default[type].getUserFavorites(username);
	                yield _this4._ensureQueueReady();

	                if (canceled()) {
	                    throw "Canceled";
	                }

	                if (_parentalControls2.default.enabled) {
	                    channels = channels.filter(function (c) {
	                        return !c.mature;
	                    });
	                }

	                const [u] = yield Promise.all([_this4._list.addUser(user), _this4._list.addChannels(filterInapropriateChannels(channels))]);
	                return u;
	            } else {
	                throw "Can't add users for provider " + type;
	            }
	        })();
	    }
	    /**
	     * @private
	     * @param {module:channel/core.User} user
	     * @async
	     * @returns {module:channel/core.User}
	     */
	    _updateUser(user) {
	        var _this5 = this;

	        return _asyncToGenerator(function* () {
	            const [updatedUser, channels] = yield _providers2.default[user.type].getUserFavorites(user.login);
	            const [finalUser] = yield Promise.all([_this5._list.setUser(updatedUser),
	            // Can't just call this.addUser(user.login, user.type) because of this.
	            _this5._list.addChannels(filterInapropriateChannels(filterExistingFavs(user, channels)))]);
	            return finalUser;
	        })();
	    }
	    /**
	     * Update a user and add any new favorites.
	     *
	     * @param {number} [userId] - ID of the user, if not specified updates
	     *                               all users.
	     * @returns {Array.<module:channel/core.User>}
	     */
	    updateUser(userId) {
	        var _this6 = this;

	        return _asyncToGenerator(function* () {
	            yield _this6._ensureQueueReady();
	            let users;
	            if (userId) {
	                users = [yield _this6._list.getUser(userId)];
	            } else {
	                users = yield _this6.getUsersByType();
	            }

	            return Promise.all(users.filter(function (user) {
	                return _providers2.default[user.type].supports.favorites;
	            }).map(_this6._updateUser.bind(_this6)));
	        })();
	    }
	    /**
	     * Get all users of the given type.
	     *
	     * @param {string} [provider=null] - Type the users should be of. If
	     *                                        omuitted all users are returned.
	     * @returns {Array.<module:channel/core.User>}
	     * @async
	     */
	    getUsersByType(provider = null) {
	        return this._ensureQueueReady().then(() => this._list.getUsersByType(provider));
	    }
	    /**
	     * Remove a user from the ChannelList and optionally remove the channels it
	     * favorited.
	     *
	     * @param {number} userId
	     * @param {boolean} [removeFavorites=false]
	     * @returns {module:channel/core.User}
	     */
	    removeUser(userId, removeFavorites = false) {
	        var _this7 = this;

	        return _asyncToGenerator(function* () {
	            yield _this7._ensureQueueReady();
	            let p = Promise.resolve();
	            if (removeFavorites) {
	                p = _this7._list.removeChannelsByUserFavorites(userId);
	            }
	            const [u] = yield Promise.all([_this7._list.removeUser(userId), p]);
	            return u;
	        })();
	    }
	    /**
	     * @private
	     * @async
	     * @param {string} provider
	     * @param {Array} credentials
	     * @returns {Array.<module:channel/core.User>}
	     */
	    _addFoundCredentials(provider, credentials) {
	        return Promise.all(credentials.filter(credential => credential.username).map(credential => {
	            console.log(`Found a credential for ${ provider } user ${ credential.username }`);
	            return this.addUser(credential.username, provider);
	        }));
	    }
	    /**
	     * @private
	     * @async
	     * @param {string} provider
	     * @param {string} url
	     * @returns {Array.<module:channel/core.User>}
	     */
	    _findUsersByURL(provider, url) {
	        return searchCredentials(url).then(this._addFoundCredentials.bind(this, provider));
	    }
	    /**
	     * Add users that have stored credentials.
	     *
	     * @param {string} [provider] - Provider to add users stored in the
	     * credentials for. If not provided, all providers are searched.
	     * @returns {Array}
	     * @async
	     */
	    autoAddUsers(provider) {
	        if (!provider || !(provider in _providers2.default)) {
	            return Promise.all(Object.keys(_providers2.default).filter(p => _providers2.default[p].supports.credentials).map(this.autoAddUsers.bind(this)));
	        } else if (_providers2.default[provider].supports.credentials) {
	            console.log(`Searching login name for ${ provider }`);
	            return Promise.all(_providers2.default[provider].authURL.map(this._findUsersByURL.bind(this, provider))).then(_underscore.flatten);
	        } else {
	            return Promise.reject(`Provider ${ provider } does not support auto adding users`);
	        }
	    }
	    /**
	     * Opens or focueses a tab with the manager.
	     *
	     * @async
	     */
	    showManager() {
	        return this._manager.open();
	    }

	    /**
	     * Set the theme of the channel manager.
	     *
	     * @param {number} theme
	     */
	    setTheme(theme) {
	        this._ensureQueueReady().then(() => this._manager.setTheme(theme));
	    }

	    /**
	     * Copies the stream URL of the given channel to the clipboard.
	     *
	     * @param {number|string} id - ID or login.
	     * @param {string} [type] - Type if not an ID is given.
	     */
	    copyChannelURL(id, type) {
	        var _this8 = this;

	        return _asyncToGenerator(function* () {
	            let channel;
	            if (type) {
	                if (!(type in _providers2.default)) {
	                    throw "Specified type is not known";
	                }

	                channel = yield _providers2.default[type].updateChannel(id);
	            } else {
	                channel = yield _this8._list.getChannel(id);
	            }

	            const url = channel.live.alternateURL ? channel.live.alternateURL : channel.url[0];

	            const p = (0, _utils.when)(document, "copy");
	            document.execCommand("copy", false, null);
	            const [e, pattern] = yield Promise.all([p, _preferences2.default.get("copy_pattern")]);

	            e.clipboardData.setData("text/plain", pattern.replace("{URL}", url));
	            e.preventDefault();

	            return channel;
	        })();
	    }
	}
	exports.default = ChannelController;

/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _twitch = __webpack_require__(11);

	var _twitch2 = _interopRequireDefault(_twitch);

	var _hitbox = __webpack_require__(21);

	var _hitbox2 = _interopRequireDefault(_hitbox);

	var _ustream = __webpack_require__(22);

	var _ustream2 = _interopRequireDefault(_ustream);

	var _youtube = __webpack_require__(23);

	var _youtube2 = _interopRequireDefault(_youtube);

	var _livestream = __webpack_require__(24);

	var _livestream2 = _interopRequireDefault(_livestream);

	var _mlg = __webpack_require__(25);

	var _mlg2 = _interopRequireDefault(_mlg);

	var _azubu = __webpack_require__(26);

	var _azubu2 = _interopRequireDefault(_azubu);

	var _beam = __webpack_require__(27);

	var _beam2 = _interopRequireDefault(_beam);

	var _picarto = __webpack_require__(28);

	var _picarto2 = _interopRequireDefault(_picarto);

	var _newLivestream = __webpack_require__(29);

	var _newLivestream2 = _interopRequireDefault(_newLivestream);

	var _streamup = __webpack_require__(30);

	var _streamup2 = _interopRequireDefault(_streamup);

	var _douyutv = __webpack_require__(31);

	var _douyutv2 = _interopRequireDefault(_douyutv);

	var _dailymotion = __webpack_require__(36);

	var _dailymotion2 = _interopRequireDefault(_dailymotion);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	exports.default = {
	    twitch: _twitch2.default,
	    hitbox: _hitbox2.default,
	    ustream: _ustream2.default,
	    youtube: _youtube2.default,
	    livestream: _livestream2.default,
	    mlg: _mlg2.default,
	    azubu: _azubu2.default,
	    beam: _beam2.default,
	    picarto: _picarto2.default,
	    newlivestream: _newLivestream2.default,
	    streamup: _streamup2.default,
	    douyutv: _douyutv2.default,
	    dailymotion: _dailymotion2.default
	}; /**
	    * Exports each provider as a property named after the provider's type. Each
	    * provider is assumed to be frozen.
	    * @author Martin Giger
	    * @license MPL-2.0
	    * @module providers
	    */

/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _querystring = __webpack_require__(12);

	var _querystring2 = _interopRequireDefault(_querystring);

	var _liveState = __webpack_require__(5);

	var _liveState2 = _interopRequireDefault(_liveState);

	var _core = __webpack_require__(13);

	var _paginationHelper = __webpack_require__(14);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	var _logic = __webpack_require__(7);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Twitch Provider.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/twitch
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @todo investigate delayed title updates
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */
	//TODO properly wait for clientID


	const type = "twitch",
	      archiveURL = "/videos/all",
	      chatURL = "/chat",
	      baseURL = 'https://api.twitch.tv/kraken',
	      headers = { 'Client-ID': '', 'Accept': 'application/vnd.twitchtv.v3+json' },
	      defaultAvatar = "https://static-cdn.jtvnw.net/jtv_user_pictures/xarth/404_user_300x300.png",
	      itemsPerPage = 100,
	      idOfChannel = new Map(),
	      SIZES = ['50', '70', '150', '300'],
	      urlForSize = (imgURL, size) => imgURL.replace("300x300", size + "x" + size),
	      getImageObj = (imgURL = defaultAvatar) => {
	    const ret = {};
	    SIZES.forEach(s => {
	        ret[s] = urlForSize(imgURL, s);
	    });
	    return ret;
	};
	_preferences2.default.get('twitch_clientId').then(id => headers['Client-ID'] = id);

	function getChannelFromJSON(jsonChannel) {
	    const ret = new _core.Channel(jsonChannel.name, type);
	    ret.uname = jsonChannel.display_name;
	    ret.url.push(jsonChannel.url);
	    ret.archiveUrl = jsonChannel.url + archiveURL;
	    ret.chatUrl = jsonChannel.url + chatURL;
	    ret.image = getImageObj(jsonChannel.logo ? jsonChannel.logo : defaultAvatar);
	    ret.title = jsonChannel.status;
	    ret.category = jsonChannel.game;
	    ret.mature = jsonChannel.mature;

	    return ret;
	}

	function getStreamTypeParam(delim = "&") {
	    return _preferences2.default.get('twitch_showPlaylist').then(showPlaylist => {
	        if (showPlaylist) {
	            return delim + "stream_type=all";
	        } else {
	            return delim + "&stream_type=live";
	        }
	    });
	}

	class Twitch extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://www.twitch.tv", "https://secure.twitch.tv", "https://passport.twitch.tv"], this._supportsFavorites = true, this._supportsCredentials = true, this._supportsFeatured = true, _temp;
	    }

	    getUserFavorites(username) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this._qs.queueRequest(baseURL + '/users/' + username, headers);

	            if (data.json && !data.json.error) {
	                const channels = yield (0, _paginationHelper.promisedPaginationHelper)({
	                    url: baseURL + '/users/' + username + '/follows/channels?limit=' + itemsPerPage + '&offset=',
	                    pageSize: itemsPerPage,
	                    request: function (url) {
	                        return _this._qs.queueRequest(url, headers);
	                    },
	                    fetchNextPage(data) {
	                        return data.parseJSON && "follows" in data.parseJSON && data.parseJSON.follows.length == itemsPerPage;
	                    },
	                    getItems(data) {
	                        if (data.parseJSON && "follows" in data.parseJSON) {
	                            return data.parseJSON.follows.map(c => getChannelFromJSON(c.channel));
	                        } else {
	                            return [];
	                        }
	                    }
	                }),
	                      user = new _core.User(data.parseJSON.name, _this._type);
	                user.uname = data.parseJSON.display_name;
	                user.image = getImageObj(data.parseJSON.logo ? data.parseJSON.logo : defaultAvatar);
	                user.favorites = channels.map(function (channel) {
	                    return channel.login;
	                });

	                return [user, channels];
	            } else {
	                throw "Couldn't fetch twitch user " + username;
	            }
	        })();
	    }
	    getChannelDetails(channelname) {
	        console.info("twitch.getChannelDetails");
	        return this._qs.queueRequest(baseURL + '/channels/' + channelname, headers).then(data => {
	            if (data.parseJSON && !data.parseJSON.error) {
	                idOfChannel.set(data.parseJSON.name, data.parseJSON._id);
	                return getChannelFromJSON(data.parseJSON);
	            } else {
	                throw data.parseJSON ? data.parseJSON.error : "Could not fetch details for " + this.name + " channel " + channelname;
	            }
	        });
	    }
	    updateFavsRequest(users) {
	        const urls = users.map(user => baseURL + '/users/' + user.login);

	        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, data => {
	            if (data.parseJSON && !data.parseJSON.error) {
	                const user = users.find(user => user.login == data.parseJSON.name);
	                user.uname = data.parseJSON.display_name;
	                user.image = getImageObj(data.parseJSON.logo ? data.parseJSON.logo : defaultAvatar);

	                new _paginationHelper.PaginationHelper({
	                    url: baseURL + '/users/' + user.login + '/follows/channels?limit=' + itemsPerPage + '&offset=',
	                    pageSize: itemsPerPage,
	                    request: url => {
	                        return this._qs.queueRequest(url, headers);
	                    },
	                    fetchNextPage(data) {
	                        return data.parseJSON && "follows" in data.parseJSON && data.parseJSON.follows.length == itemsPerPage;
	                    },
	                    getItems(data) {
	                        if (data.parseJSON && "follows" in data.parseJSON) {
	                            return data.parseJSON.follows.map(c => getChannelFromJSON(c.channel));
	                        } else {
	                            return [];
	                        }
	                    },
	                    onComplete: follows => {
	                        (0, _utils.emit)(this, "newchannels", follows.filter(c => user.favorites.every(name => name !== c.login)));

	                        user.favorites = follows.map(c => c.login);
	                        (0, _utils.emit)(this, "updateduser", user);
	                    }
	                });
	            }
	        }, headers);
	    }
	    updateRequest(channels) {
	        var _this2 = this;

	        const channelsString = channels.map(c => c.login).join(",");
	        new _paginationHelper.PaginationHelper({
	            url: baseURL + "/streams?channel=" + channelsString + "&stream_type=all&limit=" + itemsPerPage + "&offset=",
	            pageSize: itemsPerPage,
	            request: (url, callback, initial) => {
	                if (initial) {
	                    this._qs.queueUpdateRequest([url], this._qs.HIGH_PRIORITY, callback, headers);
	                } else {
	                    return this._qs.queueRequest(url, headers);
	                }
	            },
	            fetchNextPage(data, pageSize) {
	                return data.parseJSON && "streams" in data.parseJSON && data.parseJSON.streams.length == pageSize;
	            },
	            getItems: data => {
	                if (data.parseJSON && "streams" in data.parseJSON) {
	                    let streams = data.parseJSON.streams;
	                    if (!_preferences2.default.twitch_showPlaylist) {
	                        streams = streams.filter(s => !s.is_playlist);
	                    }
	                    return streams.map(obj => {
	                        const cho = getChannelFromJSON(obj.channel);
	                        cho.viewers = obj.viewers;
	                        cho.thumbnail = obj.preview.medium;
	                        if (obj.is_playlist) {
	                            cho.live = new _liveState2.default(_liveState2.default.REBROADCAST);
	                        } else {
	                            cho.live.setLive(true);
	                        }

	                        let oldChan = channels.find(ch => cho.login == ch.login);
	                        if (oldChan === undefined) {
	                            const findChan = (chan, ch) => ch.login == chan;
	                            for (let i of idOfChannel.entries()) {
	                                if (i[1] == obj.channel._id) {
	                                    oldChan = channels.find(findChan.bind(null, i[0]));
	                                    if (oldChan !== undefined) {
	                                        break;
	                                    }
	                                }
	                            }
	                        }
	                        if (oldChan !== undefined) {
	                            cho.id = oldChan.id;
	                            oldChan.live = cho.live;
	                        }
	                        return cho;
	                    });
	                } else {
	                    return [];
	                }
	            },
	            onComplete: (() => {
	                var _ref = _asyncToGenerator(function* (data) {
	                    const liveChans = yield (0, _utils.filterAsync)(data, function (cho) {
	                        return cho.live.isLive(_liveState2.default.TOWARD_OFFLINE);
	                    });
	                    if (liveChans.length) {
	                        (0, _utils.emit)(_this2, "updatedchannels", liveChans);
	                    }
	                    if (liveChans.length != channels.length) {
	                        let offlineChans = channels.filter(function (channel) {
	                            return !data.some(function (cho) {
	                                return cho.id == channel.id;
	                            });
	                        });
	                        const playlistChans = yield asyncFilter(data, function (cho) {
	                            return (0, _logic.not)(cho.live.isLive(_liveState2.default.TOWARD_OFFLINE));
	                        });
	                        offlineChans = offlineChans.concat(playlistChans);
	                        let chans = yield _this2._getHostedChannels(offlineChans, liveChans);
	                        chans = yield Promise.all(chans.map(function (chan) {
	                            if (chan.live.state == _liveState2.default.REBROADCAST) {
	                                return _this2._getActivePlaylistInfo(chan).then(function (meta) {
	                                    chan.title = meta.title;
	                                    chan.category = meta.game;
	                                    chan.thumbnail = meta.thumbnail;
	                                    return chan;
	                                }, function () {
	                                    return chan;
	                                });
	                            } else {
	                                return chan;
	                            }
	                        }));
	                        (0, _utils.emit)(_this2, "updatedchannels", chans);
	                    }
	                });

	                return function onComplete(_x) {
	                    return _ref.apply(this, arguments);
	                };
	            })()
	        });
	    }
	    updateChannel(channelname, ignoreHosted = false) {
	        var _this3 = this;

	        return _asyncToGenerator(function* () {
	            console.log("twitch.updateChannel:", channelname, ignoreHosted);
	            const [data, channel] = yield Promise.all([getStreamTypeParam("?").then(function (p) {
	                return _this3._qs.queueRequest(baseURL + '/streams/' + channelname + p, headers);
	            }), _this3.getChannelDetails(channelname)]);

	            if (data.parseJSON && data.parseJSON.stream !== null && (!ignoreHosted || !data.parseJSON.stream.is_playlist)) {
	                channel.viewers = data.parseJSON.stream.viewers;
	                channel.thumbnail = data.parseJSON.stream.preview.medium;
	                if (data.parseJSON.stream.is_playlist) {
	                    channel.live = new _liveState2.default(_liveState2.default.REBROADCAST);
	                    try {
	                        const meta = yield _this3._getActivePlaylistInfo(channel);
	                        channel.title = meta.title;
	                        channel.category = meta.game;
	                        channel.thumbnail = meta.thumbnail;
	                    } catch (e) {
	                        // empty
	                    }
	                } else {
	                    channel.live.setLive(true);
	                }
	            }

	            if (yield channel.live.isLive(_liveState2.default.TOWARD_OFFLINE)) {
	                return channel;
	            } else {
	                if (!ignoreHosted) {
	                    return _this3._getHostedChannel(channel);
	                } else {
	                    return channel;
	                }
	            }
	        })();
	    }
	    updateChannels(channels) {
	        var _this4 = this;

	        return _asyncToGenerator(function* () {
	            const logins = channels.map(function (c) {
	                return c.login;
	            }),
	                  channelsString = logins.join(","),
	                  streamTypeParam = yield getStreamTypeParam(),
	                  liveChannels = yield (0, _paginationHelper.promisedPaginationHelper)({
	                url: baseURL + '/streams?channel=' + channelsString + streamTypeParam + '&limit=' + itemsPerPage + '&offset=',
	                pageSize: itemsPerPage,
	                request: function (url) {
	                    return _this4._qs.queueRequest(url, headers);
	                },
	                fetchNextPage(data) {
	                    return data.parseJSON && !data.parseJSON.error && data.parseJSON.streams.length == itemsPerPage;
	                },
	                getItems(data) {
	                    if (data.parseJSON && !data.parseJSON.error) {
	                        return data.parseJSON.streams;
	                    } else {
	                        return [];
	                    }
	                }
	            });

	            let cho,
	                ret = yield Promise.all(liveChannels.map(function (obj) {
	                cho = getChannelFromJSON(obj.channel);
	                cho.viewers = obj.viewers;
	                cho.thumbnail = obj.preview.medium;
	                if (obj.is_playlist) {
	                    cho.live = new _liveState2.default(_liveState2.default.REBROADCAST);
	                } else {
	                    cho.live.setLive(true);
	                }

	                if (logins.includes(cho.login)) {
	                    cho.id = channels[logins.indexOf(cho.login)].id;
	                    return Promise.resolve(cho);
	                } else {
	                    return Promise.all(channels.map(function (c) {
	                        return _this4._getChannelId(c);
	                    })).then(function (ids) {
	                        ids.some(function (id, i) {
	                            if (id === obj.channel._id) {
	                                cho.id = channels[i].id;
	                                return true;
	                            }
	                            return false;
	                        });
	                        return cho;
	                    });
	                }
	            }));

	            const liveChans = yield (0, _utils.filterAsync)(ret, function (cho) {
	                return cho.live.isLive(_liveState2.default.TOWARD_OFFLINE);
	            });

	            if (liveChans.length != channels.length) {
	                const playlistChans = yield Promise.all(ret.map((() => {
	                    var _ref2 = _asyncToGenerator(function* (cho) {
	                        if (yield cho.live.isLive(_liveState2.default.TOWARD_OFFLINE)) {
	                            try {
	                                const meta = yield _this4._getActivePlaylistInfo(cho);
	                                cho.title = meta.title;
	                                cho.category = meta.game;
	                                cho.thumbnail = meta.thumbnail;
	                            } catch (e) {/* emtpy */}
	                            return cho;
	                        }
	                    });

	                    return function (_x2) {
	                        return _ref2.apply(this, arguments);
	                    };
	                })()));
	                let offlineChans = channels.filter(function (channel) {
	                    return ret.every(function (cho) {
	                        return cho.id !== channel.id;
	                    });
	                });
	                offlineChans = offlineChans.concat(playlistChans);
	                const offChans = yield _this4._getHostedChannels(offlineChans, liveChans);
	                ret = liveChans.concat(offChans);
	            }

	            return ret;
	        })();
	    }
	    getFeaturedChannels() {
	        var _this5 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this5._qs.queueRequest(baseURL + "/streams/featured", headers);
	            if (data.parseJSON && "featured" in data.parseJSON && data.parseJSON.featured.length) {
	                let chans = data.parseJSON.featured;
	                if (yield (0, _logic.not)(_this5._mature)) {
	                    chans = chans.filter(function (chan) {
	                        return !chan.stream.channel.mature;
	                    });
	                }

	                return chans.map(function (chan) {
	                    const channel = getChannelFromJSON(chan.stream.channel);
	                    channel.viewers = chan.stream.viewers;
	                    channel.thumbnail = chan.stream.preview.medium;
	                    channel.live.setLive(true);
	                    return channel;
	                });
	            } else {
	                throw "Could not get any featured channel for " + _this5.name;
	            }
	        })();
	    }
	    search(query) {
	        var _this6 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this6._qs.queueRequest(baseURL + "/search/streams?" + _querystring2.default.stringify({ q: query }), headers);
	            if (data.parseJSON && "streams" in data.parseJSON && data.parseJSON.streams.length) {
	                let chans = data.parseJSON.streams;
	                if (yield (0, _logic.not)(_this6._mature)) {
	                    chans = chans.filter(function (chan) {
	                        return !chan.channel.mature;
	                    });
	                }

	                return chans.map(function (chan) {
	                    const channel = getChannelFromJSON(chan.channel);
	                    channel.viewers = chan.viewers;
	                    channel.thumbnail = chan.preview.medium;
	                    channel.live.setLive(true);
	                    return channel;
	                });
	            } else {
	                throw "No results for the search " + query + " on " + _this6.name;
	            }
	        })();
	    }
	    _getChannelId(channel) {
	        // get the internal id for each channel.
	        if (idOfChannel.has(channel.login)) {
	            return Promise.resolve(idOfChannel.get(channel.login));
	        } else {
	            return this._qs.queueRequest(baseURL + "/channels/" + channel.login, headers).then(resp => {
	                if (resp.parseJSON && "_id" in resp.parseJSON) {
	                    idOfChannel.set(channel.login, resp.parseJSON._id);
	                    if (channel.login != resp.parseJSON.name) {
	                        idOfChannel.set(resp.parseJSON.name, resp.parseJSON._id);
	                    }
	                    return resp.parseJSON._id;
	                } else {
	                    return null;
	                }
	            }, () => null);
	        }
	    }
	    _getHostedChannels(channels, liveChans) {
	        var _this7 = this;

	        return _asyncToGenerator(function* () {
	            if (_preferences2.default.twitch_showHosting) {
	                let channelIds = yield Promise.all(channels.map(function (channel) {
	                    return _this7._getChannelId(channel);
	                }));
	                channelIds = channelIds.filter(function (id) {
	                    return id !== null;
	                });

	                const existingChans = Array.isArray(liveChans) ? channels.concat(liveChans) : channels,
	                      data = yield _this7._qs.queueRequest("https://tmi.twitch.tv/hosts?" + _querystring2.default.stringify({
	                    "include_logins": 1,
	                    host: channelIds.join(",")
	                }));

	                if (data.parseJSON && "hosts" in data.parseJSON && data.parseJSON.hosts.length) {
	                    // Check each hosted channel for his status
	                    return Promise.all(data.parseJSON.hosts.map((() => {
	                        var _ref3 = _asyncToGenerator(function* (hosting) {
	                            let chan = channels.find(function (ch) {
	                                return ch.login === hosting.host_login;
	                            });
	                            if (chan === undefined) {
	                                chan = yield _this7.updateChannel(hosting.host_login, true);
	                                chan.id = yield Promise.all(channels.map(function (c) {
	                                    return _this7._getChannelId(c);
	                                })).then(function (ids) {
	                                    let chid;
	                                    ids.some(function (id, i) {
	                                        if (id === hosting.host_login) {
	                                            chid = channels[i].id;
	                                            return true;
	                                        }
	                                        return false;
	                                    });
	                                    return chid;
	                                });
	                            }

	                            if (hosting.target_login && existingChans.every(function (ch) {
	                                return ch.login !== hosting.target_login;
	                            })) {

	                                // Check the hosted channel's status, since he isn't a channel we already have in our lists.
	                                try {
	                                    const hostedChannel = yield _this7.updateChannel(hosting.target_login, true);
	                                    if (yield hostedChannel.live.isLive(_liveState2.default.TOWARD_OFFLINE)) {
	                                        chan.title = hostedChannel.title;
	                                        chan.thumbnail = hostedChannel.thumbnail;
	                                        chan.viewers = hostedChannel.viewers;
	                                        chan.category = hostedChannel.category;
	                                        chan.live = new _liveState2.default(_liveState2.default.REDIRECT);
	                                        chan.live.alternateUsername = hostedChannel.uname;
	                                        chan.live.alternateURL = hostedChannel.url[0];
	                                    } else {
	                                        chan.live.setLive(false);
	                                    }

	                                    return chan;
	                                } catch (e) {
	                                    if (chan.live.state != _liveState2.default.REBROADCAST) {
	                                        chan.live.setLive(false);
	                                    }
	                                    return chan;
	                                }
	                            } else {
	                                if (chan.live.state != _liveState2.default.REBROADCAST) {
	                                    chan.live.setLive(false);
	                                }

	                                return chan;
	                            }
	                        });

	                        return function (_x3) {
	                            return _ref3.apply(this, arguments);
	                        };
	                    })()));
	                }
	            }
	            channels.forEach(function (chan) {
	                if (chan.live.state != _liveState2.default.REBROADCAST) {
	                    chan.live.setLive(false);
	                }
	            });
	            return channels;
	        })();
	    }
	    _getHostedChannel(channel) {
	        return this._getHostedChannels([channel]).then(chs => chs[0]);
	    }
	    _getActivePlaylistInfo(channel) {
	        var _this8 = this;

	        return _asyncToGenerator(function* () {
	            const id = yield _this8._getChannelId(channel),
	                  playlist = yield _this8._qs.queueRequest("https://api.twitch.tv/api/playlists/channels/" + id, headers);

	            if (playlist.parseJSON && playlist.parseJSON.enabled && playlist.parseJSON.active && playlist.parseJSON.playhead) {
	                const playhead = playlist.parseJSON.playhead,
	                      vod = yield _this8._qs.queueRequest(baseURL + "/videos/v" + playhead.vods[playhead.active_vod_index].id, headers);
	                if (vod.parseJSON) {
	                    return {
	                        title: vod.parseJSON.title,
	                        game: vod.parseJSON.game,
	                        thumbnail: vod.parseJSON.preview
	                    };
	                } else {
	                    throw "VOD not found";
	                }
	            } else {
	                throw "Not a channel with an active playlist";
	            }
	        })();
	    }
	}

	exports.default = Object.freeze(new Twitch(type));

/***/ },
/* 12 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	/**
	 * Build query strings from an Object
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 */

	exports.default = {
	    stringify(obj) {
	        const qs = new URLSearchParams();
	        for (let q in obj) {
	            qs.append(q, obj[q]);
	        }

	        return qs.toString();
	    }
	};

/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.User = exports.Channel = undefined;

	var _underscore = __webpack_require__(6);

	var _liveState = __webpack_require__(5);

	var _liveState2 = _interopRequireDefault(_liveState);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * Channel and User Objects.
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module channel/core
	 */
	const ITEM_ARGS = ["login", "type", "id", "live"];

	/**
	 * A generic thing.
	 * @class
	 */
	class Item {
	    /**
	     * @param {string} login - Unique login name.
	     * @param {string} type - Provider name.
	     * @param {number} [id] - Extension internal ID if already known.
	     */
	    constructor(login, type, id) {
	        this._uname = "";

	        this._login = login;
	        this._type = type;
	        /**
	         * An object with user avatars, by their size in pixels as property name.
	         * @type {Object.<(string|number)>}
	         */
	        this.image = {};
	        if (id) {
	            this.id = id;
	        }
	    }
	    /**
	     * The human-readable name of the user.
	     *
	     * @type {string}
	     * @default Value of {@link module:channel/core~Item#login}
	     */
	    get uname() {
	        if (this._uname !== "") {
	            return this._uname;
	        } else {
	            return this.login;
	        }
	    }
	    set uname(val) {
	        if (val) {
	            this._uname = val;
	        }
	    }
	    /**
	     * The login name of the user, this should be a unique string or number within
	     * the provider.
	     *
	     * @type {string|number}
	     * @readonly
	     */
	    get login() {
	        return this._login;
	    }
	    /**
	     * The provider type this user is from.
	     *
	     * @type {string}
	     * @readonly
	     */
	    get type() {
	        return this._type;
	    }
	    //methods
	    /**
	     * Retuns the URL to the best image for displaying at the specified size.
	     *
	     * @param {string|number} size - The size the image will be displayed in in pixels.
	     * @returns {string} An URL to an image.
	     */
	    getBestImageForSize(size) {
	        size = Math.round(parseInt(size, 10) * window.devicePixelRatio);
	        // shortcut if there's an image with the size demanded
	        if (this.image.hasOwnProperty(size.toString())) {
	            return this.image[size];
	        }

	        // search next biggest image
	        let index = Number.MAX_VALUE,
	            biggest = 0;
	        Object.keys(this.image).forEach(s => {
	            s = parseInt(s, 10);
	            if (s > size && s < index) {
	                index = s;
	            }
	            if (s > biggest) {
	                biggest = s;
	            }
	        });

	        if (index > biggest) {
	            index = biggest;
	        }

	        return this.image[index];
	    }

	    /**
	     * @returns {string} The human-readable name of the user with the first
	     *          letter capitalized.
	     */
	    toString() {
	        return this.uname.charAt(0).toUpperCase() + this.uname.slice(1);
	    }
	    /**
	     * Serialized version of {@link module:channel/core~Item}
	     *
	     * @typedef {Object} SerializedItem
	     * @property {string} uname
	     * @property {string} login
	     * @property {Object.<(string|number),string>} image
	     * @property {string} type
	     * @property {number} [id]
	     */

	    /**
	     * Serialize the item into a normal object.
	     *
	     * @returns {module:channel/core~SerializedItem} A JSON serializable version
	     *          of this item.
	     */
	    serialize() {
	        const obj = {
	            uname: this.uname,
	            login: this.login,
	            image: this.image,
	            type: this.type
	        };
	        if (this.id) {
	            obj.id = this.id;
	        }
	        return obj;
	    }
	}

	/**
	 * A generic user.
	 *
	 * @extends module:channel/core~Item
	 */
	class User extends Item {
	    /**
	     * @param {module:channel/core~SerializedUser} properties
	     * @returns {module:channel/core.User}
	     */
	    static deserialize(properties) {
	        const props = (0, _underscore.omit)(properties, ITEM_ARGS);
	        props._uname = properties.uname;
	        return Object.assign(new User(...ITEM_ARGS.map(a => properties[a])), props);
	    }

	    /**
	     * @param {string} login
	     * @param {string} type
	     * @param {number} [id]
	     */
	    constructor(login, type, id) {
	        super(login, type, id);

	        /**
	         * The favorite channels of this user as an array of logins.
	         * @type {Array.<string>}
	         */
	        this.favorites = [];
	    }
	    /**
	     * Serialized version of {@link module:channel/core.User}.
	     *
	     * @typedef {module:channel/core~SerializedItem} SerializedUser
	     * @property {Array.<string>} favorites
	     */
	    /**
	     * Serialize the user into a normal object.
	     *
	     * @returns {module:channel/core~SerializedUser} A JSON serializable version
	     *          of this user.
	     */
	    serialize() {
	        return Object.assign(super.serialize(), {
	            favorites: this.favorites
	        });
	    }
	}

	/**
	 * A generic Channel object.
	 *
	 * @extends module:channel/core~Item
	 */
	class Channel extends Item {
	    /**
	     * @param {module:channel/core~SerializedChannel} properties
	     * @returns {module:channel/core.Channel}
	     */
	    static deserialize(properties) {
	        const props = (0, _underscore.omit)(properties, ITEM_ARGS);
	        props._uname = properties.uname;
	        return Object.assign(new Channel(...ITEM_ARGS.map(a => properties[a])), props);
	    }

	    /**
	     * The title of the live broadcast.
	     *
	     * @type {string}
	     * @default ''
	     */

	    /**
	     * The number of viewers of the live broadcast, -1 if unknown.
	     *
	     * @type {number}
	     * @default -1
	     */

	    /**
	     * Thumbnail of the live broadcast. Typically displayed at a width of 320px.
	     *
	     * @type {string}
	     * @default ''
	     */

	    /**
	     * A URL pointing to a page listing past broadcasts. Opened when clicked on the
	     * channel while offline.
	     *
	     * @type {string}
	     * @default ''
	     */

	    /**
	     * A URL to a page containing only the chat for a broadcast.
	     *
	     * @type {string}
	     * @default ''
	     */

	    /**
	     * A UNIX timestamp, automatically set by the ChannelList.
	     *
	     * @type {number}
	     * @readonly
	     * @default Date.now()
	     */

	    /**
	     * The category of the live broadcast if known.
	     *
	     * @type {string}
	     * @default ''
	     */

	    /**
	     * If the channel's content is rated mature. Only true if the content rating
	     * is known and it is for mature audiences.
	     *
	     * @type {boolean}
	     * @default false
	     */


	    /**
	     * @param {string} login
	     * @param {string} type
	     * @param {number} [id]
	     * @param {module:channel/live-state~SerializedLiveState} [state]
	     */
	    constructor(login, type, id, state) {
	        super(login, type, id);

	        /**
	         * An array of URLs that will contain a player of the stream. The first one is
	         * treated as the main channel page and opened when the user clicks on the
	         * stream.
	         * @type {Array.<string>}
	         */
	        this.title = '';
	        this.viewers = -1;
	        this.thumbnail = '';
	        this.archiveUrl = '';
	        this.chatUrl = '';
	        this.lastModified = 0;
	        this.category = '';
	        this.mature = false;
	        this.url = [];

	        this.lastModified = Date.now();
	        if (state) {
	            this.live = _liveState2.default.deserialize(state);
	        } else {
	            this.live = new _liveState2.default();
	        }
	    }
	    // properties
	    /**
	     * @type {module:channel/live-state.LiveState}
	     * @default null
	     */
	    get live() {
	        return this._live;
	    }
	    set live(val) {
	        if (val instanceof _liveState2.default) {
	            this._live = val;
	        } else {
	            throw new TypeError("Trying to set the live state to something that isn't a LiveState");
	        }
	    }
	    /**
	     * Serialized version of {@link module:channel/core.Channel}.
	     *
	     * @typedef {module:channel/core~SerializedItem} SerializedChannel
	     * @property {string} title
	     * @property {number} viewers
	     * @property {string} thumbnail
	     * @property {Array.<string>} url
	     * @property {string} archiveUrl
	     * @property {string} chatUrl
	     * @property {number} lastModified
	     * @property {string} category
	     * @property {string} intent
	     * @proeprty {boolean} mature
	     * @property {module:channel/live-state~SerializedLiveState} live
	     */
	    /**
	     * Serialize the item into a normal object.
	     *
	     * @returns {module:channel/core~SerializedChannel} A JSON serializable
	     *          version of this channel.
	     */
	    serialize() {
	        return Object.assign(super.serialize(), {
	            title: this.title,
	            viewers: this.viewers,
	            thumbnail: this.thumbnail,
	            url: this.url,
	            archiveUrl: this.archiveUrl,
	            chatUrl: this.chatUrl,
	            lastModified: this.lastModified,
	            category: this.category,
	            mature: this.mature,
	            live: this.live.serialize()
	        });
	    }
	}

	exports.Channel = Channel;
	exports.User = User;

/***/ },
/* 14 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	/**
	 * Pagination helper for APIs with pagination
	 * @module pagination-helper
	 * @author Martin Giger
	 * @license MPL-2.0
	 */

	/**
	 * An SDK request for executing HTTP request.
	 * @external sdk/request
	 * @requires sdk/request
	 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request}
	 */
	/**
	 * Add-on SDK Response object
	 * @class Response
	 * @memberof external:sdk/request
	 * @inner
	 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request#Response}
	 */

	/**
	 * A helper object for working with paginated APIs. It fetches all the content
	 * and then returns an array of all data. Runs immediately after construction.
	 *
	 * @class
	 * @param {module:pagination-helper~PaginationHelperOptions} options
	 * @alias module:pagination-helper.PaginationHelper
	 */
	function PaginationHelper(options) {
	    this.url = options.url;
	    this.request = options.request;
	    this.fetchNextPage = options.fetchNextPage;
	    this.onComplete = options.onComplete;
	    this.getItems = options.getItems;

	    if ("pageSize" in options) {
	        this.pageSize = options.pageSize;
	    }
	    if ("getPageNumber" in options) {
	        this.getPageNumber = options.getPageNumber;
	    }

	    if ("initialPage" in options) {
	        this.page = options.initialPage;
	    }
	    this.result = [];

	    this.getPage(true);
	}

	PaginationHelper.prototype.url = "localhost/";
	PaginationHelper.prototype.page = 0;
	PaginationHelper.prototype.pageSize = 100;
	PaginationHelper.prototype.result = [];
	PaginationHelper.prototype.request = null;
	PaginationHelper.prototype.fetchNextPage = null;
	PaginationHelper.prototype.onComplete = null;
	PaginationHelper.prototype.getItems = null;
	PaginationHelper.prototype.getPageNumber = function (page, pageSize) {
	    return page + pageSize;
	};

	/**
	 * A function running a request on the provided URL and then calling the
	 * callback function. Alternatively returnes a promise. Normally is
	 * {@link module:queueservice~QueueServie.queueRequest}, which returns a
	 * {@link external:sdk/request~Response}.
	 *
	 * @callback request
	 * @argument {string} url
	 * @argument {function} callback
	 * @argument {boolean} initial - Indicating if this is the first request ran.
	 * @return {?Promise} Optionally returns a promise instead of calling the
	 *         callback function.
	 */
	/**
	 * A function determining, if the next page should be fetched.
	 *
	 * @callback fetchNextPage
	 * @argument {?} data - Whatever {@link module:pagination-helper~request} returned.
	 * @argument {number} pageSize - The expected size of a page.
	 * @return {boolean}
	 */
	/**
	 * @callback completeCallback
	 * @argument {Array} data - All the fetched items
	 */
	/**
	 * Extracts the items from a page out of an Add-on SDK Response object.
	 *
	 * @callback getItems
	 * @argument {?} data - Whatever {@link module:pagination-helper~request} returned.
	 * @return {Array} The extracted items.
	 */
	/**
	 * @callback getPageNumber
	 * @argument {number|string} page - The current page.
	 * @argument {number} pageSize - The size of a page.
	 * @argument {?} data - Whatever {@link module:pagination-helper~request} returned.
	 * @return {number|string} The next page to fetch.
	 */
	/**
	 * @typedef {Object} PaginationHelperOptions
	 * @property {string} url - The base URL to call.
	 * @property {number} [pageSize=100] - The number of expected items per full page.
	 * @property {module:pagination-helper~request} request
	 * @property {module:pagination-helper~fetchNextPage} fetchNextPage
	 * @property {module:pagination-helper~completeCallback} [onComplete]
	 * @property {module:pagination-helper~getItems} getItems
	 * @property {module:pagination-helper~getPageNumber} [getPageNumber=(page, pageSize) => page + pageSize]
	 * @property {number|string} [initialPage=0] - The first page that is fetched.
	 */

	/**
	 * Fetches the next page and then processes the content. Invokes itself
	 * recursively and is initially invoked from the constructor. If all content
	 * was fetched onComplete is called.
	 *
	 * @param {boolean} [initial=false] - If this is the first fetched page.
	 */
	PaginationHelper.prototype.getPage = function (initial = false) {
	    const cbk = data => {
	        this.result = this.result.concat(this.getItems(data));
	        if (this.fetchNextPage(data, this.pageSize)) {
	            this.page = this.getPageNumber(this.page, this.pageSize, data);
	            this.getPage();
	        } else {
	            if (this.onComplete) {
	                this.onComplete(Array.slice(this.result));
	            }
	            this.result.length = 0;
	        }
	    },
	          ret = this.request(this.url + this.page, cbk, initial);

	    if (typeof ret == "object" && "then" in ret) {
	        ret.then(cbk);
	    }
	};

	/**
	 * Get a PaginationHelper that resolves a promise. The specified callback
	 * functions are not handeld promise aware.
	 *
	 * @param {module:pagination-helper~PaginationHelperOptions} options
	 * @async
	 * @returns {undefined} The PaginationHelper is done.
	 * @alias module:pagination-helper.promisedPaginationHelper
	 */
	const promisedPaginationHelper = options => {
	    return new Promise(resolve => {
	        options.onComplete = resolve;

	        new PaginationHelper(options);
	    });
	};

	exports.promisedPaginationHelper = promisedPaginationHelper;
	exports.PaginationHelper = PaginationHelper;

/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _preferences = __webpack_require__(2);

	var _parentalControls = __webpack_require__(16);

	var _parentalControls2 = _interopRequireDefault(_parentalControls);

	var _service = __webpack_require__(17);

	var qs = _interopRequireWildcard(_service);

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	const _ = browser.i18n.getMessage; /* eslint-disable no-unused-vars */
	/**
	 * A generic provider class
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module providers/generic-provider
	 * @requires module:queue/service
	 */


	const methodNotSupported = (type, method) => Promise.reject(type + "." + method + " is not supported"),
	      queues = new WeakMap(),
	      queueFor = provider => queues.get(provider);

	/**
	 * @event module:providers/generic-provider.GenericProvider#updateduser
	 * @type {module:channel/core.User}
	 */
	/**
	 * @event module:providers/generic-provider.GenericProvider#newchannels
	 * @type {Array.<module:channel/core.Channel>}
	 */
	/**
	 * @event module:providers/generic-provider.GenericProvider#updatedchannels
	 * @type {Array.<module:channel/core.Channel>|module:channel/core.Channel}
	 */

	/**
	 * @extends external:Error
	 */
	class ProviderError extends Error {
	    constructor(code) {
	        let message;
	        switch (code) {
	            case 1:
	                message = "The API did not accept the given request format";break;
	            case 2:
	                message = "Could not access the requested resource";break;
	            case 3:
	                message = "Could not find any result for the given username";break;
	            default:
	                message = "Could not load the requested resource";break;
	        }
	        super(message);
	        this.code = code;
	        this.name = "ProviderError";
	    }
	}

	/**
	 * @class
	 * @extends module:disposable-target.Disposable
	 */
	class GenericProvider extends EventTarget {
	    static get NETWORK_ERROR() {
	        return new ProviderError(0);
	    }
	    static get API_ERROR() {
	        return new ProviderError(1);
	    }
	    static get ACCESS_ERROR() {
	        return new ProviderError(2);
	    }
	    static get NORESULT_ERROR() {
	        return new ProviderError(3);
	    }
	    static getErrorByHTTPCode(code) {
	        switch (code) {
	            case 404:
	            case 410:
	            case 415:
	            case 422:
	                return this.NORESULT_ERROR;
	            case 401:
	            case 403:
	            case 511:
	                return this.ACCESS_ERROR;
	            case 500:
	            case 501:
	            case 502:
	            case 504:
	            case 506:
	            case 507:
	            case 508:
	            case 510:
	            case 429:
	                return this.API_ERROR;
	            default:
	                return this.NETWORK_ERROR;
	        }
	    }

	    /**
	     * Internal property if the provider can get the favorites of a user.
	     *
	     * @type {boolean}
	     * @protected
	     * @default false
	     */

	    /**
	     * Internal property specifying, if the provider can get the favorites
	     * of a user based on stored credentials. The credentials checked are
	     * for the URLs in the array the
	     * {@link module:providers/generic-provider.GenericProvider#authURL}
	     * property specifies.
	     *
	     * @type {boolean}
	     * @protected
	     * @default false
	     */

	    /**
	     * Internal property specifying, if the provider can get a featured
	     * channel on the platform.
	     *
	     * @type {boolean}
	     * @protected
	     * @default false
	     */

	    /**
	     * The value of enabled.
	     *
	     * @type {boolean}
	     * @protected
	     * @readonly
	     * @default true
	     */


	    /**
	     * Array of URLs to search credentials for.
	     *
	     * @abstract
	     * @type {Array.<string>}
	     */


	    /**
	     * Generic base-class for all providers. Implements common patterns and helpers.
	     *
	     * @constructs
	     * @param {string} type - Provider type descriptor.
	     */
	    constructor(type) {
	        super();
	        /**
	         * The type specified to the constructor.
	         *
	         * @type {string}
	         * @protected
	         */
	        this._supportsFavorites = false;
	        this._supportsCredentials = false;
	        this._supportsFeatured = false;
	        this._enabled = true;
	        this._type = type;

	        queues.set(this, qs.getServiceForProvider(this._type));
	    }
	    /**
	     * An instance of the QueueService for this provider.
	     *
	     * @type {queueservice.QueueService}
	     * @protected
	     * @readonly
	     */
	    get _qs() {
	        return queueFor(this);
	    }
	    // For testing.
	    _setQs(val) {
	        queues.set(this, val);
	    }
	    /**
	     * Indicates if exploring features should hold mature results. Respects
	     * parental control settings of the OS.
	     *
	     * @returns {boolean}
	     * @protected
	     * @async
	     */
	    _mature() {
	        return _preferences.prefs.get("find_mature").then(value => value && !_parentalControls2.default.enabled);
	    }
	    /**
	     * If the provider is fully functional and should be enabled. Makes it
	     * impossible to add new channels and users and disables the update
	     * request queueing. Existing channels will be kept around, and could
	     * still be updated. getChannelDetails is also expected to return a
	     * channel that at least sets the login.
	     *
	     * @type {boolean}
	     * @readonly
	     */
	    get enabled() {
	        return this._enabled;
	    }
	    /**
	     * The human readable name of this provider, by default looks for a
	     * translated string with the id "provider_type" where type is the value of
	     * _type.
	     *
	     * @type {string}
	     * @readonly
	     */
	    get name() {
	        return _("provider" + this._type);
	    }
	    /**
	     * @returns {string} Localized name of the provider.
	     * @see {@link module:providers/generic-provider.GenericProvider#name}
	     */
	    toString() {
	        return this.name;
	    }
	    /**
	     * Frozen
	     *
	     * @typedef {Object} ProviderSupports
	     * @property {boolean} favorites - Provider supports getting a user's favorites
	     * @property {boolean} credentials - Provider supports credential based auto-detect of users
	     * @property {boolean} featured - Provider supports getting featured channels and search
	     */
	    /**
	     * An object based on the _supports properties.
	     *
	     * @type {module:providers/generic-provider~ProviderSupports}
	     * @readonly
	     */
	    get supports() {
	        return Object.freeze({
	            favorites: this._supportsFavorites && this._enabled,
	            credentials: this._supportsCredentials && this._enabled,
	            featured: this._supportsFeatured && this._enabled
	        });
	    }
	    /**
	     * Get the favorite channels of a user. Also called the followed channels.
	     *
	     * @async
	     * @param {string} username - The username of the user on the platform
	     *                            (as entered by the user in the channels
	     *                            manager).
	     * @returns {Array} A promise that resolves to an array with to elements in
	     *          this order:
	     *            - the user (an instance of a User object).
	     *            - the favorite channels, an array of Channels objects.
	     * @abstract
	     */
	    getUserFavorites(username) {
	        return methodNotSupported(this.name, "getUserFavorites");
	    }
	    /**
	     * Get a Channel object without the requirement of any live metadata.
	     *
	     * @async
	     * @param {string} channelname - The username of the channel to return
	     *                         (as entered by the user in the channels manager).
	     * @returns {module:channel/core.Channel} Channel object with at least
	     *          username, type, image and urls set.
	     * @abstract
	     */
	    getChannelDetails(channelname) {
	        return methodNotSupported(this.name, "getChannelDetails");
	    }
	    /**
	     * Queues a reocurring update request for updating the favorite channels
	     * of the users.
	     *
	     * @param {Array.<module:channel/core.User>} users - Users to update the
	     *                                                   favorites of.
	     * @fires module:providers/generic-provider.GenericProvider#updateduser
	     * @fires module:providers/generic-provider.GenericProvider#newchannels
	     * @abstract
	     */
	    updateFavsRequest(users) {
	        throw this.name + ".updateFavsRequest is not supported.";
	    }
	    /**
	     * Unqueues the reocurring update request for updating the favorite
	     * channels of the users.
	     */
	    removeFavsRequest() {
	        this._qs.unqueueUpdateRequest(this._qs.LOW_PRIORITY);
	    }
	    /**
	     * Queues a reocurring update request for updating the live status of all
	     * channels for this provider.
	     *
	     * @param {Array.<module:channel/core.Channel>} channels - The Channel
	     *                                                        objects to update.
	     * @fires module:providers/generic-provider.GenericProvider#updatedchannels
	     * @abstract
	     */
	    updateRequest(channels) {
	        throw this.name + ".updateRequest is not supported.";
	    }
	    /**
	     * Unqueues the reocurring update request for updating the live status of
	     * all channels for this provider.
	     */
	    removeRequest() {
	        this._qs.unqueueUpdateRequest(this._qs.HIGH_PRIORITY);
	    }
	    /**
	     * Updates all info for a channel, including its live metadata. By default
	     * just calls {@link module:providers/generic-provider.GenericProvider#getChannelDetails}.
	     *
	     * @async
	     * @param {string} channelname - The login of the channel.
	     * @returns {module:channel/core.Channel} Updated Channel object.
	     */
	    updateChannel(channelname) {
	        return this.getChannelDetails(channelname);
	    }
	    /**
	     * Updates the information for an array of Channel objects, including
	     * their live metadata. The default implementation calls
	     * {@link module:providers/generic-provider.GenericProvider#updateChannel}
	     * for each item.
	     *
	     * @async
	     * @param {Array.<module:channel/core.Channel>} channels - An array of
	     *                                                      channel objects.
	     * @returns {Array.<module:channel/core.Channel>} Updated Channel objects.
	     */
	    updateChannels(channels) {
	        return Promise.all(channels.map(channel => this.updateChannel(channel.login)));
	    }
	    /**
	     * Returns channels the provider is featuring. Results should be
	     * filtered if _mature is false. By default calls
	     * {@link module:providers/generic-provider.GenericProvider#search} with
	     * an empty string as argument.
	     *
	     * @async
	     * @returns {Array.<module:channel/core.Channel>} An array of featured
	     *                                                channels.
	     * @see {@link module:lib/providers/generic-provider.GenericProvider#_mature}
	     */
	    getFeaturedChannels() {
	        return this.search("");
	    }
	    /**
	     * Search for live channels. Results should be filtered if _mature is
	     * false.
	     *
	     * @async
	     * @param {string} query - A string to search for.
	     * @returns {Array.<module:channel/core.Channel>} An array of channels
	     *                                                matching the query.
	     * @abstract
	     * @see {@link module:lib/providers/generic-provider.GenericProvider#_mature}
	     */
	    search(query) {
	        return methodNotSupported(this.name, "search");
	    }
	}
	exports.default = GenericProvider;
	GenericProvider.authURL = [];

/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _sdk = __webpack_require__(3);

	var _sdk2 = _interopRequireDefault(_sdk);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	let enabled = false; /**
	                      * Parental controls wrapper.
	                      *
	                      * @author Martin Giger
	                      * @license MPL-2.0
	                      */


	const getEnabled = () => _sdk2.default.doAction("pc-enabled").then(e => enabled = e);

	exports.default = {
	    get enabled() {
	        getEnabled();
	        return enabled;
	    }
	};


	getEnabled();

/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.removeListeners = exports.addListeners = exports.resume = exports.pause = exports.updateOptions = exports.setOptions = exports.getServiceForProvider = undefined;

	var _update = __webpack_require__(18);

	var _update2 = _interopRequireDefault(_update);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * Queue service for providers. Provides a separated management for requests by
	 * provider, all in the same {@link module:queue/update.UpdateQueue}.
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module queue/service
	 * @requires module:queue/update
	 */

	//TODO pre-calculate Response.json()?
	const queue = new _update2.default(),
	      services = {},
	      defaultRequeue = response => !response.ok,
	      completeCallback = (requeue, callback, url, data) => {
	    if (!requeue(data)) {
	        callback(data, url);
	    }
	};

	/**
	 * @callback updateRequestCallback
	 * @param {external:sdk/request~Response} data
	 * @param {string} url
	 */

	/**
	 * A service providing methods for a provider to place one-time and reocurring
	 * requests.
	 *
	 * @class
	 */
	class QueueService {
	    /**
	     * @private
	     * @type {Array}
	     */
	    constructor() {
	        this.highPriorityRequestIds = [];
	        this.lowPriorityRequestIds = [];
	        this.HIGH_PRIORITY = QueueService.HIGH_PRIORITY;
	        this.LOW_PRIORITY = QueueService.LOW_PRIORITY;

	        this.highPriorityRequestIds = [];
	        this.lowPriorityRequestIds = [];
	    }

	    /**
	     * Returns the request ID array for the specified priority.
	     *
	     * @private
	     * @param {module:queue-service~QueuePriority} priority - Priority to get
	     *                                                        the array for.
	     * @returns {Array} Array of request IDs.
	     */

	    /**
	     * @private
	     * @type {Array}
	     */
	    getRequestProperty(priority) {
	        return this[priority + "PriorityRequestIds"];
	    }

	    /**
	     * Determines if the request has to be requeued due to errors.
	     *
	     * @callback requeue
	     * @param {external:sdk/request~Response} data - Response that was returned.
	     * @returns {boolean} When true, the request will be queued again.
	     */
	    /**
	     * Immediately run a request to the given URL.
	     *
	     * @param {string} url - The URL to request.
	     * @param {Object.<string, string>} [headers={}] - An object with the headers
	     *                                                 to send.
	     * @param {module:queue/service~requeue} [requeue=(r) => r.status > 499]
	     *                             - Determines if the request should be re-run.
	     * @param {number} [attempt=0] - Counter to avoid requeuing infinitely.
	     * @returns {Promise} A promise resolving with the Add-on SDK Request response.
	     */
	    queueRequest(url, headers = {}, requeue = defaultRequeue, attempt = 0) {
	        console.log("Queueing " + url);
	        return new Promise((resolve, reject) => {
	            const id = queue.addRequest({
	                url,
	                headers,
	                onComplete: data => {
	                    if (requeue(data)) {
	                        _preferences2.default.get("queueservice_maxRetries").then(maxRetries => {
	                            if (attempt < maxRetries) {
	                                resolve(this.queueRequest(url, headers, requeue, ++attempt));
	                            } else {
	                                reject("Too many attempts");
	                            }
	                        });
	                    } else {
	                        resolve(data);
	                    }
	                }
	            }, false, true);

	            if (attempt === 0 && navigator.onLine) {
	                queue.getRequestById(id);
	            }
	        });
	    }

	    /**
	     * Unqueues an all update requests of the given priority. If none is given,
	     * all update requests are unqueued.
	     *
	     * @param {module:queue/service~QueuePriority?} priority - Priority of
	     *                                                      reuqests to unqueue.
	     */
	    unqueueUpdateRequest(priority) {
	        if (!priority) {
	            this.unqueueUpdateRequest(QueueService.HIGH_PRIORITY);
	            this.unqueueUpdateRequest(QueueService.LOW_PRIORITY);
	        } else {
	            if (this.getRequestProperty(priority).length > 0) {
	                this.getRequestProperty(priority).forEach(reqId => {
	                    queue.removeRequest(reqId);
	                });
	                this.getRequestProperty(priority).length = 0;
	            }
	        }
	    }
	    /**
	     * Queue a new reocurring update request of the given priority. Removes all
	     * existing update requests of this priority.
	     *
	     * @param {Array.<string>} urls - An array of URLs to call.
	     * @param {module:queue/service~QueuePriority} priority - Priority to queue
	     *                                                        the request as.
	     * @param {module:queue/service~updateRequestCallback} callback - Called
	     *                                           whenever a request is done (for
	     *                                           each provided URL).
	     * @param {Object.<string,string>} [headers={}] - An object with header-value
	     *                                                pairs to send with the
	     *                                                request.
	     * @param {module:queue/service~requeue} [requeue=(r) => r.status > 499]
	     *                             - Determinines if a request should be re-run.
	     */
	    queueUpdateRequest(urls, priority, callback, headers = {}, requeue = defaultRequeue) {
	        console.log("Requeueing " + priority + " priority update request");
	        this.unqueueUpdateRequest(priority);
	        const requests = this.getRequestProperty(priority),
	              skips = priority == QueueService.LOW_PRIORITY ? 4 : 0;

	        requests.push(...urls.map(url => queue.addRequest({
	            url,
	            headers,
	            onComplete: completeCallback.bind(null, requeue, callback, url)
	        }, true, false, skips)));
	    }
	}

	/**
	 * Get a QueueService for the usage in a provider.
	 *
	 * @param {string} providerName - The type of the provider.
	 * @returns {module:queue/service~QueueService} QueueService for the provider.
	 */
	QueueService.HIGH_PRIORITY = "high";
	QueueService.LOW_PRIORITY = "low";
	const getServiceForProvider = exports.getServiceForProvider = providerName => {
	    if (!services.hasOwnProperty(providerName)) {
	        services[providerName] = new QueueService();
	    }
	    return services[providerName];
	};

	/**
	 * Set the internal queue refresh properties.
	 *
	 * @param {module:queue/pauseable~QueueOptions} options - Queue options.
	 */
	const setOptions = exports.setOptions = options => {
	    console.log("[QS]> setting queue options:" + options.toSource());
	    queue.autoFetch(options.interval, options.amount, options.maxSize);
	};

	/**
	 * Change the interval of the internal queue.
	 *
	 * @param {number} interval - Refresh interval in milliseconds.
	 */
	const updateOptions = exports.updateOptions = interval => {
	    console.log("[QS]> setting interval to " + interval);
	    queue.autoFetch(interval);
	};

	/**
	 * Pause the internal queue.
	 */
	const pause = exports.pause = () => {
	    queue.pause();
	};

	/**
	 * Resume the internal queue.
	 */
	const resume = exports.resume = () => {
	    queue.resume();
	};

	/**
	 * @typedef {Object} QueueServiceListener
	 * @property {function} containsPriorized - Callback for the
	 * {@link module:queue/update.UpdateQueue#event:queuepriorized} event of the
	 * internal queue.
	 * @property {function} priorizedLoaded - Callback for the
	 * {@link module:queue/update.UpdateQueue#event:allpriorizedloaded} event of the
	 * internal queue.
	 * @property {function} paused
	 * @property {function} resumed
	 */

	/**
	 * Add event listeners to the internal queue.
	 *
	 * @param {module:queue/service~QueueServiceListener} <ObjectPattern> - Listeners to add.
	 */
	const addListeners = exports.addListeners = ({ containsPriorized, priorizedLoaded, paused, resumed }) => {
	    if (containsPriorized) {
	        queue.addEventListener("queuepriorized", containsPriorized);
	    }
	    if (priorizedLoaded) {
	        queue.addEventListener("allpriorizedloaded", priorizedLoaded);
	    }
	    if (paused) {
	        queue.addEventListener("pause", paused);
	    }
	    if (resumed) {
	        queue.addEventListener("resume", resumed);
	    }
	};

	/**
	 * Remove event listeners from the internal queue.
	 *
	 * @param {module:queue/service~QueueServiceListener} <ObjectPattern> - Listeners to remove.
	 */
	const removeListeners = exports.removeListeners = ({ containsPriorized, priorizedLoaded, paused, resumed }) => {
	    if (containsPriorized) {
	        queue.removeEventListener("queuepriorized", containsPriorized);
	    }
	    if (priorizedLoaded) {
	        queue.removeEventListener("allpriorizedloaded", priorizedLoaded);
	    }
	    if (paused) {
	        queue.removeEventListener("pause", paused);
	    }
	    if (resumed) {
	        queue.removeEventListener("resume", resumed);
	    }
	};

/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _pauseable = __webpack_require__(19);

	var _pauseable2 = _interopRequireDefault(_pauseable);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * Fired when there is a new priorized item added to the queue.
	 *
	 * @event module:queue/update.UpdateQueue#queuepriorized
	 */
	/**
	 * Fired when all priorized items in the queue were fetched.
	 *
	 * @event module:queue/update.UpdateQueue#allpriorizedloaded
	 */

	/**
	 * @class module:queue/update.UpdateQueue
	 * @extends module:queue/pauseable.PauseableQueue
	 */
	/**
	 * Queue with priorized, persistant and less often fetched requests.
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module queue/update
	 * @requires module:queue/pauseable
	 */
	class UpdateQueue extends _pauseable2.default {
	    /**
	     * A queue with priorized, persistent and less often fetched requests.
	     *
	     * @constructs
	     */
	    constructor() {
	        super();
	    }
	    /**
	     * Add a request to the queue.
	     *
	     * @param {external:sdk/request.RequestOptions} requestArgs - Requst Arguments.
	     * @param {boolean} [persistent=false] - If the request should be readded
	     *                                         to the queue whenever it was
	     *                                         fetched.
	     * @param {boolean} [priorized=false] - If the request should be priorized
	     *                                        over other requests in the queue.
	     *                                        Can not be true when the request
	     *                                        is persistent and not skipping.
	     * @param {number} [skip=0] - Number of times to skip this request before
	     *                            fetching it.
	     * @returns {number} Request id.
	     * @fires module:queue/update.UpdateQueue#queuepriorized
	     */
	    addRequest(requestArgs, persistent = false, priorized = false, skip = 0) {
	        // only allow priorized if its either not a persistent request or it skips
	        // skipping requests are only priorized for the first time the are actually sent
	        // however they will the first time not skip.
	        priorized = priorized && (!persistent || skip > 0);

	        if (!this.containsPriorized() && priorized) {
	            (0, _utils.emit)(this, "queuepriorized");
	        }
	        return super.addRequest(Object.assign({
	            persist: persistent,
	            priorize: priorized,
	            skip,
	            skipped: 0
	        }, requestArgs));
	    }
	    /**
	     * Fetch multiple requests from the top of the queue.
	     *
	     * @param {number} index - Index of the request to fetch.
	     * @fires module:queue/update.UpdateQueue#allpriorizedloaded
	     */
	    getRequest(index) {
	        if (this.getFirstPriorized()) {
	            if (!this.containsPriorized()) {
	                (0, _utils.emit)(this, "allpriorizedloaded");
	            }
	        } else {
	            this.getRequestByIndex(index);
	        }
	    }
	    /**
	     * Fetch the first priorized request in the queue.
	     *
	     * @returns {boolean} If a priorized request was fetched.
	     */
	    getFirstPriorized() {
	        return this.queue.some((req, i) => {
	            if (req.priorize) {
	                this.getRequestByIndex(i);
	                return true;
	            }
	            return false;
	        });
	    }
	    /**
	     * Fetch the request at the given index.
	     *
	     * @param {number} index - Index in the queue of the request.
	     */
	    getRequestByIndex(index) {
	        console.info(this.queue.length + " jobs left in the queue.");
	        if (this.queue[index].skip > this.queue[index].skipped && !this.queue[index].priorize) {
	            console.log("[Queue]> Skipping " + this.queue[index].url);
	            this.queue[index].skipped++;

	            this.queue.push(this.queue.splice(index, 1)[0]);
	        } else {
	            console.log("[Queue]> Getting " + this.queue[index].url);

	            const req = super.getRequest(index);
	            if (req.persist) {

	                // explication of the skipping logic in the addRequest method
	                if (req.skip > 0) {
	                    req.skipped = 0;
	                    if (req.priorize) {
	                        req.priorize = false;
	                    }
	                }

	                this.queue.push(req);
	            }
	        }
	    }
	    /**
	     * Check if the queue has a priorized request waiting.
	     *
	     * @returns {boolean} Whether there is a priorized request in the queue.
	     */
	    containsPriorized() {
	        return this.queue.some(item => item.priorize);
	    }
	    /**
	     * Fetch all priorized requests.
	     *
	     * @fires module:queue/update.UpdateQueue#allpriorizedloaded
	     */
	    getAllPriorized() {
	        this.queue.filter(req => req.priorize).forEach(() => {
	            this.getFirstPriorized();
	        });
	        (0, _utils.emit)(this, "allpriorizedloaded");
	    }
	    /**
	     * @override
	     */
	    resume() {
	        super.resume();
	        if (this.containsPriorized()) {
	            this.getAllPriorized();
	        }
	    }
	}
	exports.default = UpdateQueue;

/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _index = __webpack_require__(20);

	var _index2 = _interopRequireDefault(_index);

	var _utils = __webpack_require__(4);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * @typedef {Object} QueueOptions
	 * @property {number} interval - Interval to fetch batches in.
	 * @property {number} amount - Percentage of the queue to fetch per batch.
	 * @property {number} maxSize - Maximum number of requests per batch.
	 */

	/**
	 * @event module:queue/pauseable.PauseableQueue#pause
	 */
	/**
	 * @event module:queue/pauseable.PauseableQueue#resume
	 */

	/**
	 * @class
	 * @extends module:queue.RequestQueue
	 */
	/* eslint-disable jsdoc/require-param */
	/**
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module queue/pauseable
	 * @requires module:queue
	 */
	class PauseableQueue extends _index2.default {
	  /**
	   * Pauseable queue, pauses based on the network status.
	   *
	   * @constructs
	   * @extends module:queue.RequestQueue
	   */
	  constructor() {
	    super();

	    /**
	     * @type {module:queue/pauseable~QueueOptions?}
	     * @private
	     */
	    this._configured = false;
	    this._queueState = {};

	    window.addEventListener("offline", () => this.pause(), { passive: true });
	    window.addEventListener("online", () => this.resume(), { passive: true });
	  }
	  /**
	   * @type {boolean}
	   * @default false
	   * @readonly
	   */

	  /**
	   * @type {boolean}
	   * @default false
	   */
	  get paused() {
	    return this.interval === 0;
	  }
	  /**
	   * @override
	   */
	  autoFetch(interval, amount = this._queueState.amount, maxSize = this._queueState.maxSize) {
	    if (interval > 0) {
	      this._queueState = {
	        interval,
	        amount,
	        maxSize
	      };
	      this._configured = true;
	    }
	    if (navigator.onLine || interval === 0) {
	      super.autoFetch(interval, amount, maxSize);
	    } else {
	      this.pause();
	    }
	  }
	  /**
	   * Temporarily halt execution of the queue.
	   *
	   * @fires module:queue/pauseable.PauseableQueue#pause
	   */
	  pause() {
	    if (this._configured && this.interval !== 0) {
	      this.autoFetch(0);
	      (0, _utils.emit)(this, "pause");
	    }
	  }
	  /**
	   * Resume the queue.
	   *
	   * @fires module:queue/pauseable.PauseableQueue#resume
	   */
	  resume() {
	    if (this._configured) {
	      this.autoFetch(this._queueState.interval);
	      (0, _utils.emit)(this, "resume");
	    }
	  }
	}
	exports.default = PauseableQueue;

/***/ },
/* 20 */
/***/ function(module, exports) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

	/**
	 * Queue infrastructure for updating info
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module queue
	 */

	/**
	 * @typedef {Object} external:sdk/request.RequestOptions
	 * @see {@link https://developer.mozilla.org/en-US/Add-ons/SDK/High-Level_APIs/request#Request%28options%29}
	 */

	/**
	 * @typedef {external:sdk/request.RequestOptions} RequestInfo
	 * @property {number} id
	 */
	/**
	 * @class module:queue.RequestQueue
	 * @extends external:EventTarget
	 */
	class RequestQueue extends EventTarget {
	    /**
	     * RequestQueue Object.
	     *
	     * @constructs
	     */

	    /**
	     * Last ID assigned to a request.
	     *
	     * @type {number}
	     * @default -1
	     * @protected
	     */
	    constructor() {
	        super();
	        /**
	         * @type {array.<module:queue~RequestInfo>}
	         * @protected
	         */
	        this._alarmName = "main-queue";
	        this.lastID = -1;
	        this.interval = 0;
	        this.amount = 0.5;
	        this.maxSize = 10;
	        this.queue = [];

	        browser.alarms.onAlarm.addListener(alarm => {
	            if (alarm.name == this._alarmName) {
	                const size = Math.max(1, Math.min(this.queue.length * this.amount, this.maxSize));
	                this.getRequestBatch(size);
	            }
	        });
	    }
	    /**
	     * Add a request to the queue.
	     *
	     * @param {external:sdk/request.RequestOptions} requestOptions - Options for
	     *                                                              the request.
	     * @returns {number} ID of the added request.
	     */

	    /**
	     * Time interval between fetched requests.
	     *
	     * @type {number}
	     * @default 0
	     * @readonly
	     */

	    /**
	     * ID of the queue interval.
	     *
	     * @type {number?}
	     * @private
	     */
	    addRequest(requestOptions) {
	        this.queue.push(Object.assign({ id: ++this.lastID, method: "GET" }, requestOptions));
	        return this.lastID;
	    }
	    /**
	     * Fetch the request with the given index in the queue.
	     *
	     * @param {number} index - Index of the request to fetch.
	     */
	    getRequest(index) {
	        const spec = this.queue[index];
	        fetch(spec.url, spec).then(response => {
	            return response.json().then(json => {
	                response.parsedJSON = json;
	                spec.onComplete(response);
	            }, () => {
	                spec.onComplete(response);
	            });
	        });
	        return spec;
	    }
	    /**
	     * Fetch the request with the given ID.
	     *
	     * @param {number|string} query - ID or URL of the request to fetch.
	     */
	    getRequestById(query) {
	        return this.getRequest(this.getRequestIndex(query));
	    }
	    /**
	     * Fetch multiple requests from the top of the queue.
	     *
	     * @param {number} [batchSize=this.queue.length] - Number of requests to get.
	     */
	    getRequestBatch(batchSize = this.queue.length) {
	        if (batchSize > this.queue.length) {
	            batchSize = this.queue.length;
	        }

	        for (let i = 0; i < batchSize; i++) {
	            this.getRequest(0);
	        }
	    }
	    /**
	     * Set up an interval to fetch a certain amount of requests periodically.
	     * Can also be used to change the interval.
	     *
	     * @param {number} interval - Interval in milliseconds.
	     * @param {number} amount - A percentage of requests to get per batch.
	     * @param {number} maxSize - The max number of requests to get per batch.
	     */
	    autoFetch(interval, amount, maxSize) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            _this.interval = interval;
	            _this.amount = amount;
	            _this.maxSize = maxSize;
	            if (_this.workingOnQueue()) {
	                yield browser.alarms.clear(_this._alarmName);
	            }
	            if (interval > 0) {
	                browser.alarms.create(_this._alarmName, {
	                    periodInMinutes: interval / 60000
	                });
	            }
	        })();
	    }
	    /**
	     * Remove all requests and ongoing intervals.
	     */
	    clear() {
	        if (this.workingOnQueue()) {
	            browser.alarms.clear(this._alarmName);
	        }
	        this.interval = 0;
	        if (this.queue.length > 0) {
	            this.queue.length = 0;
	        }
	    }
	    /**
	     * Check if a request is still in the queue.
	     *
	     * @param {number|string} query - ID or URL of the request.
	     * @returns {boolean} Wether the request is still queued.
	     */
	    requestQueued(query) {
	        return this.getRequestIndex(query) > -1;
	    }
	    /**
	     * Get the index of a request.
	     *
	     * @param {number|string} query - ID or URL of the request.
	     * @returns {number} Index of the request. -1 if the request couldn't be
	     * found.
	     */
	    getRequestIndex(query) {
	        if (typeof query === 'string') {
	            return this.queue.findIndex(req => req.url === query);
	        } else if (typeof query === 'number') {
	            return this.queue.findIndex(req => req.id === query);
	        }
	        return -1;
	    }
	    /**
	     * Check if the queue is currently peridoically fetching requests.
	     *
	     * @returns {boolean} Whether there is an interval set up.
	     */
	    workingOnQueue() {
	        return this.interval !== 0;
	    }
	    /**
	     * Remove a request from the queue.
	     *
	     * @param {number|string} query - ID or URL of the request.
	     * @returns {boolean} Whether or not the request has been removed.
	     */
	    removeRequest(query) {
	        if (this.requestQueued(query)) {
	            console.log("[Queue]> removing request");
	            this.queue.splice(this.getRequestIndex(query), 1);
	            return true;
	        }
	        return false;
	    }
	}
	exports.default = RequestQueue;

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	var _paginationHelper = __webpack_require__(14);

	var _querystring = __webpack_require__(12);

	var _querystring2 = _interopRequireDefault(_querystring);

	var _logic = __webpack_require__(7);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /*
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Created by Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Licensed under MPL 2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Hitbox provider
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "hitbox",
	      archiveURL = "/videos",
	      chatURL = "http://hitbox.tv/embedchat/",
	      pageSize = 100,
	      baseURL = "http://api.hitbox.tv",
	      cdnURL = "http://edge.sf.hitbox.tv";

	function getChannelFromJson(json) {
	    const cho = new _core.Channel(json.channel.user_name, type);
	    cho.uname = json.media_display_name;
	    cho.url.push(json.channel.channel_link);
	    cho.archiveUrl = json.channel.channel_link + archiveURL;
	    cho.chatUrl = chatURL + json.channel.user_name;
	    cho.image = { "200": cdnURL + json.channel.user_logo,
	        "50": cdnURL + json.channel.user_logo_small };
	    cho.title = json.media_status;
	    cho.category = json.category_name;
	    cho.viewers = json.media_views;
	    cho.thumbnail = cdnURL + json.media_thumbnail;
	    cho.live.setLive(json.media_is_live != "0");
	    cho.mature = json.media_mature === "1";
	    return cho;
	}

	class Hitbox extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://www.hitbox.tv"], this._supportsFavorites = true, this._supportsCredentials = true, this._supportsFeatured = true, _temp;
	    }

	    _getChannels(channels) {
	        return Promise.all(channels.map(channel => {
	            return this._qs.queueRequest(baseURL + '/media/live/' + channel).then(data => {
	                if (data.ok && data.parsedJSON && "livestream" in data.parsedJSON) {
	                    return getChannelFromJson(data.parsedJSON.livestream[0]);
	                } else {
	                    return null;
	                }
	            });
	        })).then(channels => channels.filter(channel => channel !== null));
	    }
	    getUserFavorites(username) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const [follows, user] = yield Promise.all([(0, _paginationHelper.promisedPaginationHelper)({
	                url: baseURL + '/following/user?user_name=' + username + '&limit=' + pageSize + '&offset=',
	                pageSize,
	                request: function (url) {
	                    return _this._qs.queueRequest(url);
	                },
	                fetchNextPage(data, pageSize) {
	                    return data.parsedJSON && "following" in data.parsedJSON && data.parsedJSON.following.length == pageSize;
	                },
	                getItems(data) {
	                    if (data.parsedJSON && "following" in data.parsedJSON) {
	                        return data.parsedJSON.following;
	                    } else {
	                        return [];
	                    }
	                }
	            }), _this._qs.queueRequest(baseURL + '/user/' + username)]);

	            if (user.ok && user.parsedJSON && user.parsedJSON.user_name !== null) {
	                const usr = new _core.User(user.parsedJSON.user_name, _this._type);
	                usr.image = {
	                    "200": cdnURL + user.parsedJSON.user_logo,
	                    "50": cdnURL + user.parsedJSON.user_logo_small
	                };
	                usr.favorites = follows.map(function (follow) {
	                    return follow.user_name;
	                });

	                const channels = yield _this._getChannels(usr.favorites);
	                return [usr, channels];
	            } else {
	                throw "Error getting info for Hitbox user " + username;
	            }
	        })();
	    }
	    getChannelDetails(channelname) {
	        return this._qs.queueRequest(baseURL + '/media/live/' + channelname).then(data => {
	            if (data.ok && data.parsedJSON && data.parsedJSON.livestream) {
	                return getChannelFromJson(data.parsedJSON.livestream[0]);
	            } else {
	                throw "Error getting details for Hitbox channel " + channelname;
	            }
	        });
	    }
	    updateFavsRequest(users) {
	        const urls = users.map(user => baseURL + '/user/' + user.login);
	        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, data => {
	            if (data.ok && data.parsedJSON) {
	                const user = users.find(user => user.login == data.parsedJSON.user_name);
	                user.image = {
	                    "200": cdnURL + data.parsedJSON.user_logo,
	                    "50": cdnURL + data.parsedJSON.user_logo_small
	                };

	                (0, _paginationHelper.promisedPaginationHelper)({
	                    url: baseURL + '/following/user?user_name=' + user.login + '&limit=' + pageSize + '&offset=',
	                    pageSize,
	                    request: url => this._qs.queueRequest(url),
	                    fetchNextPage(data, pageSize) {
	                        return data.parsedJSON && "following" in data.parsedJSON && data.parsedJSON.following.length == pageSize;
	                    },
	                    getItems(data) {
	                        if (data.parsedJSON && "following" in data.parsedJSON) {
	                            return data.parsedJSON.following;
	                        } else {
	                            return [];
	                        }
	                    }
	                }).then(follows => {
	                    const newChannels = follows.filter(follow => user.favorites.every(fav => fav != follow.user_name));
	                    user.favorites = follows.map(follow => follow.user_name);
	                    (0, _utils.emit)(this, "updateduser", user);
	                    return this._getChannels(newChannels.map(follow => follow.user_name));
	                }).then(channels => {
	                    (0, _utils.emit)(this, "newchannels", channels);
	                });
	            }
	        });
	    }
	    updateRequest(channels) {
	        const urls = channels.map(channel => baseURL + '/media/live/' + channel.login);
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, data => {
	            if (data.ok && data.parsedJSON && data.parsedJSON.livestream) {
	                (0, _utils.emit)(this, "updatedchannels", getChannelFromJson(data.parsedJSON.livestream[0]));
	            }
	        });
	    }
	    search(query) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this2._qs.queueRequest(baseURL + "/media/live/list?" + _querystring2.default.stringify({
	                publicOnly: true,
	                filter: "popular",
	                search: query
	            }));
	            if (data.ok && data.parsedJSON && data.parsedJSON.livestream && data.parsedJSON.livestream.length) {
	                let chans = data.parsedJSON.livestream;
	                if (yield (0, _logic.not)(_this2._mature())) {
	                    chans = chans.filter(function (m) {
	                        return m.media_mature !== "1";
	                    });
	                }

	                return chans.map(function (chan) {
	                    return getChannelFromJson(chan);
	                });
	            } else {
	                throw "Couldn't find any channels for the search on " + _this2.name + " that match " + query;
	            }
	        })();
	    }
	}

	exports.default = Object.freeze(new Hitbox(type));

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /*
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Created by Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Licensed under MPL 2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "ustream",
	      chatURL = "http://ustream.tv/socialstream/",
	      baseURL = 'https://api.ustream.tv/';

	function getChannelFromJSON(jsonChannel) {
	    console.info("ustream:getChannelFromJSON");
	    const ret = new _core.Channel(jsonChannel.id, type);
	    ret.uname = jsonChannel.title;

	    // Url stuff. It's pretty fun.
	    if ("originalUrl" in jsonChannel) {
	        ret.url.push(jsonChannel.originalUrl);
	        ret.archiveUrl = jsonChannel.originalUrl;
	    }
	    if ("url" in jsonChannel) {
	        ret.url.push("http://ustream.tv/channel/" + jsonChannel.url);
	        if (!ret.archiveUrl) {
	            ret.archiveUrl = "http://ustream.tv/channel/" + jsonChannel.url;
	        }
	    }
	    if ("tinyurl" in jsonChannel) {
	        ret.url.push(jsonChannel.tinyurl);
	        if (!ret.archiveUrl) {
	            ret.archiveUrl = "http://ustream.tv/channel/" + jsonChannel.url;
	        }
	    }
	    ret.chatUrl = chatURL + jsonChannel.id;

	    if ("picture" in jsonChannel) {
	        ret.image = {};
	        let size;
	        Object.keys(jsonChannel.picture).forEach(s => {
	            size = s.split("x")[0];
	            ret.image[size] = jsonChannel.picture[s];
	        });
	    } else {
	        ret.image = { "48": jsonChannel.owner.picture };
	    }
	    if ("tags" in jsonChannel && jsonChannel.tags.length > 0) {
	        ret.category = jsonChannel.tags[0];
	    }
	    ret.live.setLive(jsonChannel.status == "live");
	    if ("thumbnail" in jsonChannel) {
	        ret.thumbnail = jsonChannel.thumbnail.live;
	    }
	    if ("stats" in jsonChannel) {
	        ret.viewers = jsonChannel.status == "live" ? jsonChannel.stats.viewer : jsonChannel.stats.viewer_total;
	    }
	    return ret;
	}

	class Ustream extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://ustream.tv"], _temp;
	    }

	    getChannelDetails(channelname) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            let data = yield _this._qs.queueRequest("http://ustream.tv/" + channelname),
	                retried = false;

	            if (!data.ok) {
	                data = yield _this._qs.queueRequest("http://ustream.tv/channel/" + channelname);
	                if (!data.ok) {
	                    throw "Error getting channel details for channel " + channelname;
	                }
	                retried = true;
	            }

	            const page = yield data.text(),
	                  channelId = page.match(/<meta name="ustream:channel_id" content="([0-9]+)">/)[1],
	                  response = yield _this._qs.queueRequest(baseURL + "channels/" + channelId + ".json");

	            if (response.parsedJSON && "channel" in response.parsedJSON) {
	                const jsonChannel = response.parsedJSON.channel;

	                if (!retried) {
	                    jsonChannel.originalUrl = "http://ustream.tv/" + channelname;
	                }

	                return getChannelFromJSON(jsonChannel);
	            } else {
	                throw "Error getting channel details for channel " + channelname;
	            }
	        })();
	    }
	    updateRequest(channels) {
	        const urls = channels.map(channel => baseURL + "channels/" + channel.login + ".json");
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, data => {
	            if (data.parsedJSON && data.parsedJSON.channel) {
	                (0, _utils.emit)(this, "updatedchannels", getChannelFromJSON(data.parsedJSON.channel));
	            }
	        });
	    }
	    updateChannel(channelname) {
	        console.info("Ustream.updateChannel");
	        return this._qs.queueRequest(baseURL + 'channels/' + channelname + ".json").then(data => {
	            console.info("Ustream.updateChannel.requestCallback");
	            if (data.parsedJSON && data.parsedJSON.channel) {
	                return getChannelFromJSON(data.parsedJSON.channel);
	            } else {
	                throw "Could not update channel " + channelname + " for " + this.name;
	            }
	        });
	    }
	}

	exports.default = Object.freeze(new Ustream(type));

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _querystring = __webpack_require__(12);

	var _querystring2 = _interopRequireDefault(_querystring);

	var _underscore = __webpack_require__(6);

	var _core = __webpack_require__(13);

	var _paginationHelper = __webpack_require__(14);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * YouTube provider
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/youtube
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "youtube",
	      apiKey = _preferences2.default.get('youtube_apiKey'),
	      headers = {
	    Referer: "extension:jtvn.humanoids.be"
	},
	      baseURL = "https://www.googleapis.com/youtube/v3/",
	      getLocale = () => {
	    return browser.i18n.getUILanguage();
	};

	class YouTube extends _genericProvider2.default {
	    constructor(type) {
	        var _this;

	        _this = super(type);
	        /**
	         * Get the name for a category. Does caching.
	         *
	         * @argument {string} categoryId
	         * @return {string}
	         * @async
	         * @todo Handle locale changes -> use memoize and make lang an argument?
	         * @method
	         */
	        this.authURL = ["https://accounts.google.com"];
	        this._supportsFavorites = true;
	        this._supportsFeatured = true;
	        this._getCategory = (0, _underscore.memoize)((() => {
	            var _ref = _asyncToGenerator(function* (categoryId) {
	                console.info(_this.name + "._getCategory(", categoryId, ")");
	                const data = yield _this._qs.queueRequest(baseURL + "videoCategories?" + _querystring2.default.stringify({
	                    "part": "snippet",
	                    "id": categoryId,
	                    "hl": getLocale(),
	                    "key": yield apiKey
	                }), headers);

	                if (data.parsedJSON && "items" in data.parsedJSON && data.parsedJSON.items.length) {
	                    return data.parsedJSON.items[0].snippet.title;
	                } else {
	                    return '';
	                }
	            });

	            return function (_x) {
	                return _ref.apply(this, arguments);
	            };
	        })(), id => id + "|" + getLocale());
	    }

	    _getChannelById(channelId) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this2._qs.queueRequest(baseURL + "channels?" + _querystring2.default.stringify({
	                part: "snippet",
	                id: channelId,
	                fields: "items(snippet/title,snippet/thumbnails)",
	                key: yield apiKey
	            }), headers);
	            if (data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
	                const ch = new _core.Channel(channelId, _this2._type);
	                ch.url.push("https://youtube.com/channel/" + ch.login + "/live");
	                ch.url.push("https://gaming.youtube.com/channel/" + ch.login + "/live");
	                ch.archiveUrl = "https://youtube.com/channel/" + ch.login + "/videos";
	                ch.chatUrl = "https://youtube.com/channel/" + ch.login + "/discussion";
	                ch.image = { "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
	                    "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
	                };
	                ch.uname = data.parsedJSON.items[0].snippet.title;
	                return ch;
	            } else {
	                throw "Getting channel details failed: " + data.status;
	            }
	        })();
	    }

	    getUserFavorites(username) {
	        var _this3 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this3._qs.queueRequest(baseURL + "channels?" + _querystring2.default.stringify({
	                part: "id,snippet",
	                forUsername: username,
	                fields: "items(id,snippet/title,snippet/thumbnails)",
	                key: yield apiKey
	            }), headers);

	            if (data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
	                const ch = new _core.User(data.parsedJSON.items[0].id, _this3._type);
	                let page = 0;
	                const subsOptions = {
	                    part: "snippet",
	                    channelId: data.parsedJSON.items[0].id,
	                    maxResults: 50,
	                    key: yield apiKey
	                };
	                ch.image = { "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
	                    "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
	                };
	                ch.uname = data.parsedJSON.items[0].snippet.title;

	                const subscriptions = yield (0, _paginationHelper.promisedPaginationHelper)({
	                    url: baseURL + "subscriptions?" + _querystring2.default.stringify(subsOptions),
	                    pageSize: subsOptions.maxResults,
	                    initialPage: "",
	                    request: function (url) {
	                        return _this3._qs.queueRequest(url, headers);
	                    },
	                    getPageNumber(page, pageSize, data) {
	                        return data.parsedJSON.nextPageToken;
	                    },
	                    fetchNextPage(data) {
	                        return data.parsedJSON && data.parsedJSON.items && data.parsedJSON.pageInfo.totalResults > data.parsedJSON.pageInfo.resultsPerPage * ++page;
	                    },
	                    getItems(data) {
	                        if (data.parsedJSON && data.parsedJSON.items) {
	                            return data.parsedJSON.items;
	                        } else {
	                            return [];
	                        }
	                    }
	                });

	                if (subscriptions.length) {
	                    ch.favorites = subscriptions.map(function (sub) {
	                        return sub.snippet.resourceId.channelId;
	                    });

	                    const channels = subscriptions.map(function (sub) {
	                        const ret = new _core.Channel(sub.snippet.resourceId.channelId, _this3._type);
	                        ret.archiveUrl = "https://youtube.com/channel/" + ret.login + "/videos";
	                        ret.chatUrl = "https://youtube.com/channel/" + ret.login + "/discussion";
	                        ret.image = { "88": sub.snippet.thumbnails.default.url,
	                            "240": sub.snippet.thumbnails.high.url };
	                        ret.uname = sub.snippet.title;
	                        return ret;
	                    });

	                    return [ch, channels];
	                } else {
	                    /** @todo Sometimes needs oAuth for some reason, I guess privacy
	                      * settings. This also triggers when the user follows noone. */
	                    throw "Can't get favorites for youtube user " + username + " without oAuth as somebody with reading rights of this user's subs.";
	                }
	            } else {
	                throw "Error getting details for youtube user " + username;
	            }
	        })();
	    }
	    getChannelDetails(username) {
	        var _this4 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this4._qs.queueRequest(baseURL + "channels?" + _querystring2.default.stringify({
	                part: "id,snippet",
	                forUsername: username,
	                fields: "items(id,snippet/title,snippet/thumbnails)",
	                key: yield apiKey
	            }), headers);
	            if (data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
	                const ch = new _core.Channel(data.parsedJSON.items[0].id, _this4._type);
	                ch.url.push("https://youtube.com/channel/" + ch.login);
	                ch.archiveUrl = "https://youtube.com/channel/" + ch.login + "/videos";
	                ch.chatUrl = "https://youtube.com/channel/" + ch.login + "/discussion";
	                ch.image = { "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
	                    "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
	                };
	                ch.uname = data.parsedJSON.items[0].snippet.title;
	                return ch;
	            } else {
	                // Try to get the channel by ID if we can't get it by username.
	                return _this4._getChannelById(username);
	            }
	        })();
	    }
	    updateFavsRequest(users) {
	        var _this5 = this;

	        return _asyncToGenerator(function* () {
	            const urls = yield Promise.all(users.map((() => {
	                var _ref2 = _asyncToGenerator(function* (user) {
	                    return baseURL + "channels?" + _querystring2.default.stringify({
	                        part: "id,snippet",
	                        id: user.login,
	                        fields: "items(id,snippet/title,snippet/thumbnails)",
	                        key: yield apiKey
	                    });
	                });

	                return function (_x2) {
	                    return _ref2.apply(this, arguments);
	                };
	            })()));
	            _this5._qs.queueUpdateRequest(urls, _this5._qs.LOW_PRIORITY, (() => {
	                var _ref3 = _asyncToGenerator(function* (data) {
	                    if (data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
	                        const ch = new _core.User(data.parsedJSON.items[0].id, _this5._type),
	                              subsOptions = {
	                            part: "snippet",
	                            channelId: data.parsedJSON.items[0].id,
	                            maxResults: 50,
	                            key: yield apiKey
	                        };
	                        let page = 0;
	                        ch.image = { "88": data.parsedJSON.items[0].snippet.thumbnails.default.url,
	                            "240": data.parsedJSON.items[0].snippet.thumbnails.high.url
	                        };
	                        ch.uname = data.parsedJSON.items[0].snippet.title;
	                        const subscriptions = yield (0, _paginationHelper.promisedPaginationHelper)({
	                            url: baseURL + "subscriptions?" + _querystring2.default.stringify(subsOptions),
	                            pageSize: subsOptions.maxResults,
	                            initialPage: "",
	                            request: function (url) {
	                                return _this5._qs.queueRequest(url, headers);
	                            },
	                            getPageNumber(page, pageSize, data) {
	                                return data.parsedJSON.nextPageToken;
	                            },
	                            fetchNextPage(data) {
	                                return data.parsedJSON && data.parsedJSON.items && data.parsedJSON.pageInfo.totalResults > data.parsedJSON.pageInfo.resultsPerPage * ++page;
	                            },
	                            getItems(data) {
	                                if (data.parsedJSON && data.parsedJSON.items) {
	                                    return data.parsedJSON.items;
	                                } else {
	                                    return [];
	                                }
	                            }
	                        });
	                        if (subscriptions.length) {
	                            const oldUser = users.find(function (usr) {
	                                return usr.login === ch.login;
	                            });
	                            ch.id = oldUser.id;
	                            ch.favorites = subscriptions.map(function (sub) {
	                                return sub.snippet.resourceId.channelId;
	                            });
	                            (0, _utils.emit)(_this5, "updateduser", ch);
	                            (0, _utils.emit)(_this5, "newchannels", subscriptions.filter(function (follow) {
	                                return !oldUser.favorites.some(function (fav) {
	                                    return fav === follow.snippet.resourceId.channelId;
	                                });
	                            }).map(function (sub) {
	                                const ret = new _core.Channel(sub.snippet.resourceId.channelId, _this5._type);
	                                ret.archiveUrl = "https://youtube.com/channel/" + ch.login + "/videos";
	                                ret.chatUrl = "https://youtube.com/channel/" + ch.login + "/discussion";
	                                ret.image = { "88": sub.snippet.thumbnails.default.url,
	                                    "240": sub.snippet.thumbnails.high.url };
	                                ret.uname = sub.snippet.title;
	                                return ret;
	                            }));

	                            oldUser.favorites = ch.favorites;
	                        } else {
	                            /** @todo Sometimes needs oAuth for some reason, I guess privacy settings. */
	                            console.warn("Can't get favorites for youtube user " + ch.uname + " without oAuth as somebody with reading rights of this user's subs.");
	                        }
	                    }
	                });

	                return function (_x3) {
	                    return _ref3.apply(this, arguments);
	                };
	            })(), headers);
	        })();
	    }
	    updateRequest(channels) {
	        var _this6 = this;

	        return _asyncToGenerator(function* () {
	            let offlineCount = 0;
	            const ids = [],
	                  urls = yield Promise.all(channels.map((() => {
	                var _ref4 = _asyncToGenerator(function* (channel) {
	                    return baseURL + "search?" + _querystring2.default.stringify({
	                        part: "id",
	                        channelId: channel.login,
	                        fields: "items(id/videoId)",
	                        maxResults: 1,
	                        eventType: "live",
	                        type: "video",
	                        key: yield apiKey
	                    });
	                });

	                return function (_x4) {
	                    return _ref4.apply(this, arguments);
	                };
	            })())),
	                  getLiveStreams = (() => {
	                var _ref5 = _asyncToGenerator(function* (ids) {
	                    const videos = yield _this6._qs.queueRequest(baseURL + "videos?" + _querystring2.default.stringify({
	                        part: "id, snippet, liveStreamingDetails",
	                        id: ids,
	                        fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
	                        key: yield apiKey,
	                        hl: getLocale()
	                    }), headers);
	                    if (videos.parsedJSON && videos.parsedJSON.items) {
	                        return Promise.all(videos.parsedJSON.items.map(function (video) {
	                            return _this6._getCategory(video.snippet.categoryId).then(function (category) {
	                                const channel = channels.find(function (channel) {
	                                    return channel.login == video.snippet.channelId;
	                                });
	                                channel.live.setLive(true);
	                                channel.url = ["https://youtube.com/watch?v=" + video.id, "https://gaming.youtube.com/watch?v=" + video.id, "https://youtube.com/channel/" + channel.login + "/live", "https://gaming.youtube.com/channel/" + channel.login + "/live"];
	                                channel.title = video.snippet.title;
	                                channel.thumbnail = video.snippet.thumbnails.medium.url;
	                                channel.viewers = video.liveStreamingDetails.concurrentViewers;
	                                channel.category = category;
	                                return channel;
	                            });
	                        }));
	                    } else {
	                        throw "Could not find the given stream";
	                    }
	                });

	                return function getLiveStreams(_x5) {
	                    return _ref5.apply(this, arguments);
	                };
	            })(),
	                  done = function (id) {
	                if (id) {
	                    ids.push(id);
	                } else {
	                    offlineCount++;
	                }
	                if (ids.length + offlineCount == channels.length) {
	                    getLiveStreams(ids.join(",")).then(function (chans) {
	                        (0, _utils.emit)(_this6, "updatedchannels", chans);
	                    });
	                    ids.length = 0;
	                    offlineCount = 0;
	                }
	            };

	            //TODO there should be a way to do this with a generator.

	            _this6._qs.queueUpdateRequest(urls, _this6._qs.HIGH_PRIORITY, function (data, url) {
	                const channelLogin = url.match(/channelId=([\w-]+)?&/)[1],
	                      channel = channels.find(function (channel) {
	                    return channelLogin == channel.login;
	                });
	                if (data.parsedJSON && data.parsedJSON.items && data.parsedJSON.items.length) {
	                    done(data.parsedJSON.items[0].id.videoId);
	                } else {
	                    channel.live.setLive(false);
	                    channel.url = ["https://youtube.com/channel/" + channel.login];
	                    (0, _utils.emit)(_this6, "updatedchannels", channel);
	                    done();
	                }
	            }, headers);
	        })();
	    }
	    updateChannel(channellogin) {
	        var _this7 = this;

	        return _asyncToGenerator(function* () {
	            const [ch, response] = yield Promise.all([_this7._getChannelById(channellogin), apiKey.then(function (key) {
	                return _this7._qs.queueRequest(baseURL + "search?" + _querystring2.default.stringify({
	                    part: "id",
	                    channelId: channellogin,
	                    fields: "items(id/videoId)",
	                    maxResults: 1,
	                    eventType: "live",
	                    type: "video",
	                    key
	                }), headers);
	            })]);

	            if (response.parsedJSON && response.parsedJSON.items) {
	                if (response.parsedJSON.items.length) {
	                    ch.live.setLive(true);
	                    ch.url.push("https://youtube.com/watch?v=" + response.parsedJSON.items[0].id.videoId);
	                    ch.url.push("https://gaming.youtube.com/watch?v=" + response.parsedJSON.items[0].id.videoId);

	                    const video = yield _this7._qs.queueRequest(baseURL + "videos?" + _querystring2.default.stringify({
	                        part: "snippet, liveStreamingDetails",
	                        id: response.parsedJSON.items[0].id.videoId,
	                        fields: "items(snippet(categoryId,title,thumbnails/medium/url),liveStreamingDetails/concurrentViewers)",
	                        key: yield apiKey,
	                        hl: getLocale()
	                    }), headers);
	                    if (video.parsedJSON && video.parsedJSON.items) {
	                        ch.title = video.parsedJSON.items[0].snippet.title;
	                        ch.thumbnail = video.parsedJSON.items[0].snippet.thumbnails.medium.url;
	                        ch.viewers = video.parsedJSON.items[0].liveStreamingDetails.concurrentViewers;
	                        ch.category = yield _this7._getCategory(video.parsedJSON.items[0].snippet.categoryId);
	                    }
	                } else {
	                    ch.live.setLive(false);
	                    ch.url.push("https://youtube.com/channel/" + ch.login);
	                }

	                return ch;
	            }
	        })();
	    }
	    updateChannels(channels) {
	        var _this8 = this;

	        return _asyncToGenerator(function* () {
	            let streamIds = yield Promise.all(channels.map((() => {
	                var _ref6 = _asyncToGenerator(function* (channel) {
	                    const response = yield _this8._qs.queueRequest(baseURL + "search?" + _querystring2.default.stringify({
	                        part: "id",
	                        channelId: channel.login,
	                        fields: "items(id/videoId)",
	                        maxResults: 1,
	                        eventType: "live",
	                        type: "video",
	                        key: yield apiKey
	                    }), headers);
	                    if (!response.parsedJSON || !response.parsedJSON.items || !response.parsedJSON.items.length) {
	                        channel.live.setLive(false);
	                        channel.url = ["https://youtube.com/channel/" + channel.login];
	                    }
	                    return response;
	                });

	                return function (_x6) {
	                    return _ref6.apply(this, arguments);
	                };
	            })()));

	            streamIds = streamIds.map(function (response) {
	                if (response.parsedJSON && response.parsedJSON.items && response.parsedJSON.items.length) {
	                    return response.parsedJSON.items[0].id.videoId;
	                }
	                return null;
	            }).filter(function (id) {
	                return id !== null;
	            });

	            const videos = yield _this8._qs.queueRequest(baseURL + "videos?" + _querystring2.default.stringify({
	                part: "id, snippet, liveStreamingDetails",
	                id: streamIds.join(","),
	                fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
	                key: yield apiKey,
	                hl: getLocale()
	            }), headers);

	            if (videos.parsedJSON && videos.parsedJSON.items) {
	                yield Promise.all(videos.parsedJSON.items.map(function (video) {
	                    return _this8._getCategory(video.snippet.categoryId).then(function (category) {
	                        const channel = channels.find(function (channel) {
	                            return channel.login == video.snippet.channelId;
	                        });
	                        channel.live.setLive(true);
	                        channel.url = ["https://youtube.com/watch?v=" + video.id, "https://gaming.youtube.com/watch?v=" + video.id, "https://youtube.com/channel/" + channel.login + "/live", "https://gaming.youtube.com/channel/" + channel.login + "/live"];
	                        channel.title = video.snippet.title;
	                        channel.thumbnail = video.snippet.thumbnails.medium.url;
	                        channel.viewers = video.liveStreamingDetails.concurrentViewers;
	                        channel.category = category;
	                        return channel;
	                    });
	                }));
	            }

	            return channels;
	        })();
	    }
	    search(query) {
	        var _this9 = this;

	        return _asyncToGenerator(function* () {
	            const response = yield _this9._qs.queueRequest(baseURL + "search?" + _querystring2.default.stringify({
	                part: "id",
	                fields: "items(id/videoId)",
	                eventType: "live",
	                type: "video",
	                order: "relevance",
	                relevanceLanguage: browser.i18n.getUILanguage().substr(0, 2),
	                safeSearch: yield _this9._mature() ? "moderate" : "strict",
	                q: query,
	                key: yield apiKey
	            }), headers);

	            let streamIds = [];
	            if (response.parsedJSON && response.parsedJSON.items && response.parsedJSON.items.length) {
	                streamIds = response.parsedJSON.items.map(function (entry) {
	                    return entry.id.videoId;
	                });
	            } else {
	                throw "No search results found for " + _this9.name + " with " + query;
	            }

	            const videos = yield _this9._qs.queueRequest(baseURL + "videos?" + _querystring2.default.stringify({
	                part: "id, snippet, liveStreamingDetails",
	                id: streamIds.join(","),
	                fields: "items(id,snippet(channelId,title,thumbnails/medium/url,categoryId),liveStreamingDetails/concurrentViewers)",
	                key: yield apiKey,
	                hl: getLocale()
	            }), headers);

	            if (videos.parsedJSON && videos.parsedJSON.items) {
	                return yield Promise.all(videos.parsedJSON.items.map((() => {
	                    var _ref7 = _asyncToGenerator(function* (video) {
	                        const channel = yield _this9._getChannelById(video.snippet.channelId);
	                        channel.live.setLive(true);
	                        channel.url = ["https://youtube.com/watch?v=" + video.id, "https://gaming.youtube.com/watch?v=" + video.id];
	                        channel.title = video.snippet.title;
	                        channel.thumbnail = video.snippet.thumbnails.medium.url;
	                        if ("liveStreamingDetails" in video) {
	                            channel.viewers = video.liveStreamingDetails.concurrentViewers;
	                        }
	                        channel.category = yield _this9._getCategory(video.snippet.categoryId);

	                        return channel;
	                    });

	                    return function (_x7) {
	                        return _ref7.apply(this, arguments);
	                    };
	                })()));
	            }

	            throw "None of the searchresults exist for " + _this9.name;
	        })();
	    }
	}

	exports.default = Object.freeze(new YouTube(type));

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @todo implement favorites stuff
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/livestream
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "livestream",
	      baseURL = ".api.channel.livestream.com/2.0/";

	function getChannelAPIUrl(channellogin) {
	    return "http://x" + channellogin.replace(/_/g, "-") + "x" + baseURL;
	}

	class Livestream extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://new.livestream.com", "https://secure.livestream.com"], _temp;
	    }

	    getChannelDetails(username) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const ch = new _core.Channel(username.toLowerCase(), _this._type),
	                  [data, response] = yield Promise.all([_this._qs.queueRequest(getChannelAPIUrl(ch.login) + "info.json"), _this._qs.queueRequest(getChannelAPIUrl(ch.login) + "latestclips.json?maxresults=1")]);

	            if (data.parsedJSON && data.parsedJSON.channel) {
	                console.info("Creating livestream channel");
	                ch.uname = data.parsedJSON.channel.title;
	                ch.title = "";
	                ch.url.push(data.parsedJSON.channel.link);
	                ch.image = { "100": data.parsedJSON.channel.image.url };
	                ch.category = data.parsedJSON.channel.category;
	                ch.live.setLive(data.parsedJSON.channel.isLive);
	                ch.viewers = data.parsedJSON.channel.currentViewerCount;
	                ch.archiveUrl = data.parsedJSON.channel.link;
	                ch.chatUrl = data.parsedJSON.channel.link + "/chat";

	                if (response.parsedJSON && response.parsedJSON.channel.item && response.parsedJSON.channel.item.length > 0) {
	                    ch.thumbnail = response.parsedJSON.channel.item[0].thumbnail["@url"];
	                }

	                return ch;
	            } else {
	                throw "Error getting details for the Livestream channel " + username;
	            }
	        })();
	    }
	    updateRequest(channels) {
	        const urls = channels.map(channel => getChannelAPIUrl(channel.login) + "livestatus.json");
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, (data, url) => {
	            if (data.parsedJSON && data.parsedJSON.channel) {
	                const requestLogin = url.match(/http:\/\/x([a-zA-Z0-9-]+)x\./)[1].replace("-", "_"),
	                      channel = channels.find(channel => requestLogin == channel.login);
	                channel.live.setLive(data.parsedJSON.channel.isLive);
	                channel.viewers = data.parsedJSON.channel.currentViewerCount;
	                this._qs.queueRequest(getChannelAPIUrl(channel.login) + "latestclips.json?maxresults=1").then(data => {
	                    if (data.parsedJSON && "channel" in data.parsedJSON && data.parsedJSON.channel.item.length) {
	                        channel.thumbnail = data.parsedJSON.channel.item[0].thumbnail["@url"];
	                    }
	                    (0, _utils.emit)(this, "updatedchannels", channel);
	                });
	            }
	        });
	    }
	}

	exports.default = Object.freeze(new Livestream(type));

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	var _liveState = __webpack_require__(5);

	var _liveState2 = _interopRequireDefault(_liveState);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * MLG.tv Provider
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/mlg
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */
	/*
	Inofficial MLG.tv (major league gaming streams) API doc:

	Username: cleartext username used in the channel URL
	stream_name: mlg[0-9]+, which seems to be the stream ID
	channel_id: [0-9]+, which seems to be the ID for the channel (used in image URLs and chat)


	http://tv.majorleaguegaming.com/channel/{username}
	http://chat.majorleaguegaming.com/{channel_id}


	all of these seem to also support JSONP with the callback= parameter.
	http://www.majorleaguegaming.com/player/config.json?id={username} username -> media[0].channel
	http://streamapi.majorleaguegaming.com/service/streams/all status of all streams with stream_name and channel_id
	http://streamapi.majorleaguegaming.com/service/streams/status/{stream_name} status and viewer count of just the specified stream
	    status: -1 for offline, 1 for live, 2 for rebroadcast
	http://www.majorleaguegaming.com/api/channels/all.js All the info about all the channels
	    field parameter can limit the fields. You'll find the available fields if you don't specify any
	http://www.majorleaguegaming.com/api/games/all.js All names and images for all game_id values
	http://streamapi.majorleaguegaming.com/service/streams/playback/{stream name}?format=all playback URL + name & id

	https://accounts.majorleaguegaming.com/follows/retrieve returns all the channel ids the currently logged in user (cookie mlg_login for username, mlg_id for the id) follows
	There are also the actions to follow and unfollow a channel, but I am not sure how they work, as I don't care.

	*/


	const type = "mlg",
	      chatURL = "http://chat.majorleaguegaming.com/",
	      baseURL = 'http://streamapi.majorleaguegaming.com/service/streams/',
	      infoURL = 'http://www.majorleaguegaming.com/api/channels/all.js',
	      gameURL = 'http://www.majorleaguegaming.com/api/games/all.js',
	      infoArgs = "?fields=id,slug,name,stream_name,subtitle,image_1_1,image_16_9_medium,url,bracket_url,game_id";

	/**
	 * @enum {number}
	 * @name Status
	 * @readonly
	 * @property {number} Offline=-1
	 * @property {number} Live=1
	 * @property {number} Rebroadcast=2
	 */
	/**
	 * @param {module:providers/mlg~Status} status - State of the channel.
	 * @returns {boolean} If the channel should be considered live.
	 * @async
	 */
	function isLive(status) {
	    return _preferences2.default.get("mlg_showRebroadcasts").then(showRebroadcasts => status != -1 && (showRebroadcasts || status != 2));
	}

	// Takes a game_id
	let games = [];

	class MLG extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://mlg.tv"], _temp;
	    }

	    _getGame(id) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const game = games.find(function (g) {
	                return g.id == id;
	            });
	            if (!game) {
	                const data = yield _this._qs.queueRequest(gameURL);
	                if (data.parsedJSON && data.parsedJSON.data.items && data.parsedJSON.data.items.length) {
	                    games = data.parsedJSON.data.items;
	                    return data.parsedJSON.data.items.find(function (g) {
	                        return g.id == id;
	                    }).name;
	                } else {
	                    throw data.parsedJSON ? data.json.errors : "Could not fetch games for " + _this.name;
	                }
	            } else {
	                return game.name;
	            }
	        })();
	    }
	    _getChannelFromJSON(jsonChannel) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            console.info("MLG:getChannelFromJSON");
	            const ret = new _core.Channel(jsonChannel.stream_name, _this2._type);
	            ret.uname = jsonChannel.name;
	            ret.url.push(jsonChannel.url);
	            ret.archiveUrl = jsonChannel.bracket_url ? jsonChannel.bracket_url : jsonChannel.url;
	            ret.chatUrl = chatURL + jsonChannel.id;
	            ret.image = { "200": jsonChannel.image_1_1 };
	            ret.title = jsonChannel.subtitle;
	            ret.thumbnail = jsonChannel.image_16_9_medium;
	            try {
	                const game = yield _this2._getGame(jsonChannel.game_id);
	                ret.category = game;
	            } catch (e) {
	                // ingore
	            }

	            return ret;
	        })();
	    }
	    getChannelDetails(channelname) {
	        var _this3 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this3._qs.queueRequest(infoURL + infoArgs);
	            if (data.ok && data.parsedJSON.status_code == 200) {
	                const cho = data.parsedJSON.data.items.find(function (ch) {
	                    return ch.slug.toLowerCase() == channelname.toLowerCase();
	                });
	                return _this3._getChannelFromJSON(cho);
	            } else {
	                throw "Couldn't get the channel details for " + channelname + " for " + _this3.name;
	            }
	        })();
	    }
	    updateRequest(channels) {
	        var _this4 = this;

	        this._qs.queueUpdateRequest([baseURL + "all"], this._qs.HIGH_PRIORITY, (() => {
	            var _ref = _asyncToGenerator(function* (data) {
	                const info = yield _this4._qs.queueRequest(infoURL + infoArgs);

	                if (data.parsedJSON && data.parsedJSON.status_code == 200 && info.parsedJSON && info.parsedJSON.status_code == 200) {
	                    let chans = data.parsedJSON.data.items.filter(function (status) {
	                        return channels.some(function (channel) {
	                            return status.stream_name == channel.login;
	                        });
	                    });

	                    chans = yield Promise.all(chans.map((() => {
	                        var _ref2 = _asyncToGenerator(function* (status) {
	                            const channel = yield _this4._getChannelFromJSON(info.parsedJSON.data.items.find(function (ch) {
	                                return ch.id == status.channel_id;
	                            }));
	                            if (status.status == 2) {
	                                channel.live = new _liveState2.default(_liveState2.default.REBROADCAST);
	                            } else {
	                                channel.live.setLive((yield isLive(status.status)));
	                            }
	                            return channel;
	                        });

	                        return function (_x2) {
	                            return _ref2.apply(this, arguments);
	                        };
	                    })()));
	                    (0, _utils.emit)(_this4, "updatedchannels", chans);
	                }
	            });

	            return function (_x) {
	                return _ref.apply(this, arguments);
	            };
	        })());
	    }
	    updateChannel(channelname) {
	        var _this5 = this;

	        return _asyncToGenerator(function* () {
	            console.info("MLG.updateChannel");
	            const [data, info] = yield Promise.all([_this5._qs.queueRequest(baseURL + 'status/' + channelname), _this5._qs.queueRequest(infoURL + infoArgs)]);
	            console.info("MLG.updateChannel.requestCallback");
	            if (data.parsedJSON && data.parsedJSON.status_code == 200 && info.parsedJSON && info.parsedJSON.status_code == 200) {
	                const id = info.parsedJSON.data.items.find(function (ch) {
	                    return ch.id == data.parsedJSON.data.channel_id;
	                }),
	                      channel = yield _this5._getChannelFromJSON(id);
	                if (data.parsedJSON.data.status == 2) {
	                    channel.live = new _liveState2.default(_liveState2.default.REBROADCAST);
	                } else {
	                    channel.live.setLive((yield isLive(data.parsedJSON.data.status)));
	                }
	                channel.viewers = data.parsedJSON.data.viewers;

	                return channel;
	            } else {
	                throw "Something went wrong when updating " + channelname;
	            }
	        })();
	    }
	    updateChannels(channels) {
	        var _this6 = this;

	        return _asyncToGenerator(function* () {
	            console.info("MLG.updateChannels");
	            const [data, info] = yield Promise.all([_this6._qs.queueRequest(baseURL + "all"), _this6._qs.queueRequest(infoURL + infoArgs)]);

	            if (data.parsedJSON && data.parsedJSON.status_code == 200 && info.parsedJSON && info.parsedJSON.status_code == 200) {
	                const followedChannels = data.parsedJSON.data.items.filter(function (status) {
	                    return channels.some(function (channel) {
	                        return status.stream_name == channel.login;
	                    });
	                });
	                return Promise.all(followedChannels.map((() => {
	                    var _ref3 = _asyncToGenerator(function* (status) {
	                        const id = info.parsedJSON.data.items.find(function (ch) {
	                            return ch.id == status.channel_id;
	                        });
	                        const channel = yield _this6._getChannelFromJSON(id);
	                        if (status.status == 2) {
	                            channel.live = new _liveState2.default(_liveState2.default.REBROADCAST);
	                        } else {
	                            channel.live.setLive((yield isLive(status.status)));
	                        }
	                        return channel;
	                    });

	                    return function (_x3) {
	                        return _ref3.apply(this, arguments);
	                    };
	                })()));
	            }
	            throw "Could not update channels";
	        })();
	    }
	}

	exports.default = Object.freeze(new MLG(type));

/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _querystring = __webpack_require__(12);

	var _querystring2 = _interopRequireDefault(_querystring);

	var _core = __webpack_require__(13);

	var _paginationHelper = __webpack_require__(14);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /*
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Created by Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Licensed under MPL 2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "azubu",
	      baseURL = 'https://api.azubu.tv/public/',
	      pageSize = 100;

	function getChannelFromJSON(jsonChannel) {
	    console.info("Azubu:getChannelFromJSON");
	    const ret = new _core.Channel(jsonChannel.user.username, type),
	          channelUrl = jsonChannel.url_channel || "http://www.azubu.tv/" + ret.login;
	    if ("display_name" in jsonChannel.user) {
	        ret.uname = jsonChannel.user.display_name;
	    }
	    ret.url.push(channelUrl);
	    ret.archiveUrl = channelUrl;
	    ret.chatUrl = jsonChannel.url_chat;
	    ret.image = {
	        50: jsonChannel.user.profile.url_photo_small,
	        260: jsonChannel.user.profile.url_photo_large
	    };
	    ret.live.setLive(jsonChannel.is_live);
	    ret.thumbnail = jsonChannel.url_thumbnail;
	    ret.viewers = jsonChannel.view_count;
	    if (ret.title !== null) {
	        ret.title = jsonChannel.title;
	    }
	    ret.category = jsonChannel.category.title;
	    return ret;
	}

	class Azubu extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://www.azubu.tv"], this._supportsFavorites = true, this._supportsCredentials = true, this._supportsFeatured = true, _temp;
	    }

	    getUserFavorites(username) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const [follows, userData] = yield Promise.all([(0, _paginationHelper.promisedPaginationHelper)({
	                url: baseURL + "user/" + username + "/followings/list?limit=" + pageSize + "&offset=",
	                pageSize,
	                request: function (url) {
	                    return _this._qs.queueRequest(url);
	                },
	                fetchNextPage(data) {
	                    return data.parsedJSON && "data" in data.parsedJSON && data.parsedJSON.data.length == data.parsedJSON.limit;
	                },
	                getItems(data) {
	                    if (data.parsedJSON && "data" in data.parsedJSON) {
	                        return data.parsedJSON.data;
	                    } else {
	                        return [];
	                    }
	                }
	            }), _this._qs.queueRequest(baseURL + "user/" + username + "/profile")]);
	            if (userdata.parsedJSON && "data" in userdata.parsedJSON) {
	                const user = new _core.User(userdata.parsedJSON.data.user.username, _this._type);
	                if ("display_name" in userdata.parsedJSON.data.user) {
	                    user.uname = userdata.parsedJSON.data.user.display_name;
	                }
	                user.image = {
	                    50: userdata.parsedJSON.data.url_photo_small,
	                    260: userdata.parsedJSON.data.url_photo_large
	                };
	                user.favorites = follows.map(function (follow) {
	                    return follow.follow.username;
	                });

	                const channels = yield _this.updateChannels(follows.map(function (follow) {
	                    return { login: follow.follow.username };
	                }));

	                return [user, channels];
	            } else {
	                throw "Couldn't fetch the details for the azubu user " + username;
	            }
	        })();
	    }

	    getChannelDetails(channelname) {
	        return this._qs.queueRequest(baseURL + "channel/" + channelname).then(data => {
	            if (data.status == 200 && data.parsedJSON && data.parsedJSON.data) {
	                return getChannelFromJSON(data.parsedJSON.data);
	            } else {
	                throw "Error getting channel details for channel " + channelname;
	            }
	        });
	    }
	    updateFavsRequest(users) {
	        const urls = users.map(user => baseURL + "user/" + user.login + "/profile");
	        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, data => {
	            if (data.parsedJSON && data.parsedJSON.data) {
	                const user = new _core.User(data.parsedJSON.data.user.username, this._type);
	                if ("display_name" in data.parsedJSON.data.user) {
	                    user.uname = data.parsedJSON.data.user.display_name;
	                }
	                user.image = {
	                    50: data.parsedJSON.data.url_photo_small,
	                    260: data.parsedJSON.data.url_photo_large
	                };

	                const oldUser = users.find(u => u.login === user.login);
	                user.id = oldUser.id;

	                new _paginationHelper.PaginationHelper({
	                    url: baseURL + "user/" + user.login + "/followings/list?limit=" + pageSize + "&offset=",
	                    pageSize,
	                    request: url => {
	                        return this._qs.queueRequest(url);
	                    },
	                    fetchNextPage(data) {
	                        return data.parsedJSON && "data" in data.parsedJSON && data.parsedJSON.data.length == data.parsedJSON.limit;
	                    },
	                    getItems(data) {
	                        if (data.parsedJSON && "data" in data.parsedJSON) {
	                            return data.parsedJSON.data;
	                        } else {
	                            return [];
	                        }
	                    },
	                    onComplete: follows => {
	                        user.favorites = follows.map(follow => follow.follow.username);
	                        (0, _utils.emit)(this, "updateduser", user);

	                        // only add the channels the user wasn't following already.
	                        this.updateChannels(follows.filter(follow => oldUser.favorites.every(fav => fav !== follow.follow.username)).map(follow => ({ login: follow.follow.username }))).then(channels => {
	                            (0, _utils.emit)(this, "newchannels", channels);
	                        });

	                        oldUser.favorites = user.favorites;
	                    }
	                });
	            }
	        });
	    }
	    updateRequest(channels) {
	        const channelnames = channels.map(ch => ch.login).join(",");

	        new _paginationHelper.PaginationHelper({
	            url: baseURL + "channel/list?channels=" + channelnames + "&limit=" + pageSize + "&offset=",
	            pageSize,
	            request: (url, callback, initial) => {
	                if (initial) {
	                    this._qs.queueUpdateRequest([url], this._qs.HIGH_PRIORITY, callback);
	                } else {
	                    return this._qs.queueRequest(url);
	                }
	            },
	            fetchNextPage(data) {
	                return data.parsedJSON && "data" in data.parsedJSON && data.parsedJSON.data.length === data.parsedJSON.limit;
	            },
	            onComplete: chans => {
	                (0, _utils.emit)(this, "updatedchannels", chans.map(getChannelFromJSON));
	            },
	            getItems(data) {
	                if (data.parsedJSON && data.parsedJSON.data) {
	                    return data.parsedJSON.data;
	                } else {
	                    return [];
	                }
	            }
	        });
	    }
	    updateChannels(channels) {
	        console.info("Azubu.updateChannels");
	        if (channels.length === 0) {
	            return Promise.resolve([]);
	        }

	        const channelnames = channels.map(ch => ch.login).join(",");

	        return (0, _paginationHelper.promisedPaginationHelper)({
	            url: baseURL + "channel/list?channels=" + channelnames + "&limit=" + pageSize + "&offset=",
	            pageSize,
	            request: url => {
	                return this._qs.queueRequest(url);
	            },
	            fetchNextPage(data) {
	                return data.parsedJSON && "data" in data.parsedJSON && data.parsedJSON.data.length === data.parsedJSON.limit;
	            },
	            getItems(data) {
	                if (data.parsedJSON && data.parsedJSON.data) {
	                    return data.parsedJSON.data;
	                } else {
	                    return [];
	                }
	            }
	        }).then(chans => chans.map(getChannelFromJSON));
	    }
	    getFeaturedChannels() {
	        return this._qs.queueRequest(baseURL + "channel/live/list?limit=60").then(data => {
	            if (data.parsedJSON && "data" in data.parsedJSON && data.parsedJSON.data.length) {
	                return data.parsedJSON.data.map(getChannelFromJSON);
	            } else {
	                throw "No featured channels found for " + this.name;
	            }
	        });
	    }
	    search(query) {
	        return this._qs.queueRequest(baseURL + 'modules/search/channel?' + _querystring2.default.stringify({
	            orderBy: '{"channel.updatedAt":"desc"}',
	            "access_token": '',
	            _format: "json",
	            q: query
	        })).then(data => {
	            if (data.parsedJSON && "data" in data.parsedJSON && data.parsedJSON.data.length) {
	                return data.parsedJSON.data.map(getChannelFromJSON);
	            } else {
	                throw "No results found for " + query + " on " + this.name;
	            }
	        });
	    }
	}

	exports.default = Object.freeze(new Azubu(type));

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _underscore = __webpack_require__(6);

	var _paginationHelper = __webpack_require__(14);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	var _logic = __webpack_require__(7);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Beam provider.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/beam
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @todo checkout socket based events
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "beam",
	      chatURL = "https://beam.pro/embed/chat/",
	      baseURL = 'https://beam.pro/api/v1/',
	      pageSize = 50,
	      DEFAULT_AVATAR_URL = "https://beam.pro/_latest/img/media/profile.jpg",
	      SIZES = ['50', '70', '150', '300'],
	      getImageFromUserID = id => {
	    const image = {};
	    SIZES.forEach(s => {
	        image[s] = `${ baseURL }users/${ id }/avatar?w=${ s }&h=${ s }`;
	    });
	    return image;
	};

	function getChannelFromJSON(jsonChannel) {
	    const ret = new _core.Channel(jsonChannel.token, type);
	    ret.live.setLive(jsonChannel.online);
	    ret.title = jsonChannel.name;
	    ret.viewers = jsonChannel.viewersCurrent;
	    // this is the actual thumbnail and not just the default channel thumbnail thing.
	    ret.thumbnail = "https://thumbs.beam.pro/channel/" + jsonChannel.id + ".big.jpg";
	    ret.url.push("https://beam.pro/" + jsonChannel.token);
	    ret.archiveUrl = "https://beam.pro/" + jsonChannel.token;
	    ret.chatUrl = chatURL + jsonChannel.token;
	    ret.mature = jsonChannel.audience === "18+";
	    ret.image = getImageFromUserID(jsonChannel.user.id);
	    if (jsonChannel.type !== null) {
	        ret.category = jsonChannel.type.name;
	    }
	    return ret;
	}

	function getImageFromAvatars(avatars) {
	    const image = {};
	    if (Array.isArray(avatars) && avatars.length) {
	        avatars.forEach(avatar => {
	            /*
	             * The URL given by the API doesn't work at this point. Reconstruct
	             * the one used on the site.
	             */
	            image[avatar.meta.size.split("x")[0]] = `https://images.beam.pro/${ avatar.meta.size }/https://uploads.beam.pro/avatar/${ avatar.relid }.jpg`;
	        });
	    } else {
	        image["220"] = DEFAULT_AVATAR_URL;
	    }
	    return image;
	}

	class Beam extends _genericProvider2.default {

	    constructor(type) {
	        super(type);
	        this.authURL = ["https://beam.pro"];
	        this._supportsFavorites = true;
	        this._supportsCredentials = true;
	        this._supportsFeatured = true;
	        this._getUserIdFromUsername = (0, _underscore.memoize)(username => {
	            return this._qs.queueRequest(baseURL + "users/search?query=" + username).then(response => {
	                if (response.ok && response.parsedJSON) {
	                    return response.parsedJSON.find(val => val.username == username).id;
	                }
	                throw `Could not find user for ${ username }`;
	            });
	        });
	    }
	    getUserFavorites(username) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const userid = yield _this._getUserIdFromUsername(username),
	                  user = yield _this._qs.queueRequest(baseURL + "users/" + userid);

	            if (user.parsedJSON) {
	                const ch = new _core.User(user.parsedJSON.username, _this._type);
	                if ("avatars" in user.parsedJSON) {
	                    ch.image = getImageFromAvatars(user.parsedJSON.avatars);
	                } else {
	                    ch.image = getImageFromUserID(user.parsedJSON.id);
	                }

	                const subscriptions = yield (0, _paginationHelper.promisedPaginationHelper)({
	                    url: baseURL + "users/" + userid + "/follows?limit=" + pageSize + "&page=",
	                    pageSize,
	                    initialPage: 0,
	                    request: function (url) {
	                        return _this._qs.queueRequest(url);
	                    },
	                    getPageNumber(page) {
	                        return ++page;
	                    },
	                    fetchNextPage(data, pageSize) {
	                        return data.parsedJSON && data.parsedJSON.length == pageSize;
	                    },
	                    getItems(data) {
	                        return data.parsedJSON || [];
	                    }
	                });

	                ch.favorites = subscriptions.map(function (sub) {
	                    return sub.token;
	                });

	                const channels = yield Promise.all(subscriptions.map(function (sub) {
	                    return _this.getChannelDetails(sub.token);
	                }));

	                return [ch, channels];
	            } else {
	                throw `Could not get favorites for user ${ username } on ${ _this.name }`;
	            }
	        })();
	    }
	    updateFavsRequest(users) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            const urls = yield Promise.all(users.map(function (user) {
	                return _this2._getUserIdFromUsername(user.login).then(function (id) {
	                    return baseURL + "users/" + id;
	                });
	            }));

	            _this2._qs.queueUpdateRequest(urls, _this2._qs.LOW_PRIORITY, function (data, url) {
	                if (data.parsedJSON) {
	                    const ch = new _core.User(data.parsedJSON.username, _this2._type);
	                    if ("avatars" in data.parsedJSON) {
	                        ch.image = getImageFromAvatars(data.parsedJSON.avatars);
	                    } else {
	                        ch.image = getImageFromUserID(data.parsedJSON.id);
	                    }

	                    const oldUser = users.find(function (usr) {
	                        return usr.login === ch.login;
	                    });
	                    ch.id = oldUser.id;

	                    new _paginationHelper.PaginationHelper({
	                        url: url + "/follows?limit=" + pageSize + "&page=",
	                        pageSize,
	                        initialPage: 0,
	                        request: function (url) {
	                            return _this2._qs.queueRequest(url);
	                        },
	                        getPageNumber: function (page) {
	                            return page + 1;
	                        },
	                        fetchNextPage(data, pageSize) {
	                            return data.parsedJSON && data.parsedJSON.length == pageSize;
	                        },
	                        getItems: function (data) {
	                            return data.parsedJSON || [];
	                        },
	                        onComplete: function (follows) {
	                            ch.favorites = follows.map(function (sub) {
	                                return sub.token;
	                            });
	                            (0, _utils.emit)(_this2, "updateduser", ch);

	                            Promise.all(follows.filter(function (sub) {
	                                return oldUser.favorites.every(function (fav) {
	                                    return fav !== sub.token;
	                                });
	                            }).map(function (sub) {
	                                return _this2.getChannelDetails(sub.token);
	                            })).then(function (channels) {
	                                (0, _utils.emit)(_this2, "newchannels", channels);
	                                oldUser.favorites = ch.favorites;
	                            });
	                        }
	                    });
	                }
	            });
	        })();
	    }
	    getChannelDetails(channelname) {
	        return this._qs.queueRequest(baseURL + "channels/" + channelname).then(response => {
	            if (response.parsedJSON) {
	                return getChannelFromJSON(response.parsedJSON);
	            } else {
	                throw "Error getting the details for the beam channel " + channelname;
	            }
	        });
	    }
	    updateRequest(channels) {
	        const urls = channels.map(channel => `${ baseURL }channels/${ channel.login }`);
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, data => {
	            if (data.parsedJSON) {
	                const channel = getChannelFromJSON(data.parsedJSON);
	                (0, _utils.emit)(this, "updatedchannels", channel);
	            }
	        });
	    }
	    getFeaturedChannels() {
	        var _this3 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this3._qs.queueRequest(baseURL + "channels?limit=8&page=0&order=online%3Adesc%2CviewersCurrent%3Adesc%2CviewersTotal%3Adesc&where=suspended.eq.0%2Conline.eq.1");
	            if (data.parsedJSON && data.parsedJSON.length) {
	                let chans = data.parsedJSON;
	                if (yield (0, _logic.not)(_this3._mature())) {
	                    chans = chans.filter(function (ch) {
	                        return ch.audience !== "18+";
	                    });
	                }

	                return chans.map(function (chan) {
	                    return getChannelFromJSON(chan);
	                });
	            } else {
	                throw "Didn't find any featured channels for " + _this3.name;
	            }
	        })();
	    }
	    search(query) {
	        var _this4 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this4._qs.queueRequest(baseURL + "channels?where=online.eq.1%2Ctoken.eq." + query);
	            if (data.parsedJSON && data.parsedJSON.length) {
	                let chans = data.parsedJSON;
	                if (yield (0, _logic.not)(_this4._mature())) {
	                    chans = chans.filter(function (ch) {
	                        return ch.audience !== "18+";
	                    });
	                }

	                return chans.map(function (chan) {
	                    return getChannelFromJSON(chan);
	                });
	            } else {
	                throw "No results for " + query + " on " + _this4.name;
	            }
	        })();
	    }
	}

	exports.default = Object.freeze(new Beam(type));

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	const type = "picarto",
	      baseURL = 'https://ptvappapi.picarto.tv',
	      apiKey = '03e26294-b793-11e5-9a41-005056984bd4'; /**
	                                                        * Provider for picarto.
	                                                        * @author Martin Giger
	                                                        * @license MPL-2.0
	                                                        * @module providers/picarto
	                                                        * @todo Fix live status detection. Probably not possible before picarto gets an API.
	                                                        */


	function getChannelFromJSON(jsonChan) {
	    const ret = new _core.Channel(jsonChan.channel.toLowerCase(), type);
	    ret.uname = jsonChan.channel;
	    ret.image = { 101: jsonChan.avatar_url };
	    ret.thumbnail = jsonChan.thumbnail_url;
	    ret.url.push("https://picarto.tv/" + ret.login);
	    ret.archiveUrl = "https://picarto.tv/" + ret.login;
	    ret.chatUrl = "https://picarto.tv/chatpopout/" + ret.login;
	    ret.live.setLive(jsonChan.is_online);
	    ret.mature = jsonChan.is_nsfw;
	    ret.viewers = jsonChan.current_viewers;
	    ret.title = jsonChan.channel_title;
	    ret.category = jsonChan.is_multistream ? browser.i18n.getMessage("providerPicartoMultistream") : jsonChan.content_type;
	    return ret;
	}

	class Picarto extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["https://picarto.tv"], _temp;
	    }

	    getChannelDetails(channelname) {
	        return this._qs.queueRequest(`${ baseURL }/channel/${ channelname.toLowerCase() }?key=${ apiKey }`).then(resp => {
	            if (resp.ok) {
	                return getChannelFromJSON(resp.parseJSON);
	            } else {
	                throw `Channel ${ channelname } does not exist for ${ this.name }`;
	            }
	        });
	    }
	    updateRequest(channels) {
	        const urls = channels.map(channel => `${ baseURL }/channel/${ channel.login }?key=${ apiKey }`);
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, page => {
	            if (page.ok) {
	                const channel = getChannelFromJSON(page.parseJSON);
	                (0, _utils.emit)(this, "updatedchannels", channel);
	            }
	        });
	    }
	}

	exports.default = Object.freeze(new Picarto(type));

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	var _paginationHelper = __webpack_require__(14);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * New livestream provider. For API reverseenigneering see Issue #99
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/new-livestream
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "newlivestream",
	      baseURL = "http://livestream.com/api/accounts/",
	      getChannelFromJSON = json => {
	    const chan = new _core.Channel(json.short_name || json.id, type);
	    chan.uname = json.full_name;
	    chan.image = {
	        [json.picture.width]: json.picture.url,
	        "170": json.picture.small_url,
	        "50": json.picture.thumb_url
	    };
	    chan.category = json.category_name;
	    chan.archiveUrl = "http://livestream.com/" + chan.login;
	    chan.chatUrl = "http://livestream.com/" + chan.login;
	    return chan;
	};

	class NewLivestream extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://livestream.com"], this.supportsFavorites = true, _temp;
	    }

	    _getChannelStatus(json, channel) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            // Checks if there are any upcoming or past events and if yes, if one is currently being broadcast.
	            const event = Array.isArray(json.upcoming_events.data) && json.upcoming_events.data.find(function (event) {
	                return event.broadcast_id != -1;
	            }) || Array.isArray(json.past_events.data) && json.past_events.data.find(function (event) {
	                return event.broadcast_id != -1;
	            });

	            if (event) {
	                channel.title = event.full_name;
	                channel.viewers = event.viewer_count;
	                channel.url.push("http://livestream.com/" + channel.login + "/events/" + event.id);
	                const info = yield _this._qs.queueRequest(baseURL + json.id + "/events/" + event.id + "/stream_info");

	                if (info.parsedJSON && !("message" in info.parsedJSON)) {
	                    channel.live.setLive(info.parsedJSON.is_live);
	                    channel.thumbnail = info.parsedJSON.thumbnail_url;
	                }
	            }
	            return channel;
	        })();
	    }
	    getUserFavorites(username) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            const user = yield _this2._qs.queueRequest(baseURL + username);

	            if (user.parsedJSON && "id" in user.parsedJSON) {
	                const usr = new _core.User(user.parsedJSON.short_name || user.parsedJSON.id, _this2._type);
	                usr.uname = user.parsedJSON.full_name;
	                usr.image = {
	                    [user.parsedJSON.picture.width]: user.parsedJSON.picture.url,
	                    "170": user.parsedJSON.picture.small_url,
	                    "50": user.parsedJSON.picture.thumb_url
	                };
	                const follows = yield (0, _paginationHelper.promisedPaginationHelper)({
	                    url: baseURL + user.parsedJSON.id + "/following?maxItems=50&page=",
	                    pageSize: 50,
	                    request: function (url) {
	                        return _this2._qs.queueRequest(url);
	                    },
	                    fetchNextPage(data) {
	                        return data.parsedJSON && data.parsedJSON.total > this.result.length;
	                    },
	                    getItems(data) {
	                        if (data.parsedJSON && "data" in data.parsedJSON) {
	                            return data.parsedJSON.data;
	                        } else {
	                            return [];
	                        }
	                    },
	                    getPageNumber(page) {
	                        return page + 1;
	                    }
	                }),
	                      channels = follows.map(function (follow) {
	                    return getChannelFromJSON(follow);
	                });

	                usr.favorites = channels.map(function (channel) {
	                    return channel.login;
	                });
	                return [usr, channels];
	            } else {
	                throw "Couldn't get favorites for the channel " + username + " on " + _this2.name;
	            }
	        })();
	    }
	    getChannelDetails(channelname) {
	        return this._qs.queueRequest(baseURL + channelname).then(data => {
	            if (data.parsedJSON && "id" in data.parsedJSON) {
	                return getChannelFromJSON(data.parsedJSON);
	            } else {
	                throw "Couldn't get details for the " + this.name + " channel " + channelname;
	            }
	        });
	    }
	    updateFavsRequest(users) {
	        const urls = users.map(user => baseURL + user.login);
	        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, user => {
	            if (user.parsedJSON && "id" in user.parsedJSON) {
	                const usr = users.find(u => u.login == user.parsedJSON.id || u.login == user.parsedJSON.short_name);
	                usr.uname = user.parsedJSON.full_name;
	                usr.image = {
	                    [user.parsedJSON.picture.width]: user.parsedJSON.picture.url,
	                    "170": user.parsedJSON.picture.small_url,
	                    "50": user.parsedJSON.picture.thumb_url
	                };
	                (0, _paginationHelper.promisedPaginationHelper)({
	                    url: baseURL + user.parsedJSON.id + "/following?maxItems=50&page=",
	                    pageSize: 50,
	                    request: url => {
	                        return this._qs.queueRequest(url);
	                    },
	                    fetchNextPage(data) {
	                        return data.parsedJSON && data.parsedJSON.total > this.result.length;
	                    },
	                    getItems(data) {
	                        if (data.parsedJSON && "data" in data.parsedJSON) {
	                            return data.parsedJSON.data;
	                        } else {
	                            return [];
	                        }
	                    },
	                    getPageNumber(page) {
	                        return page + 1;
	                    }
	                }).then(follows => {
	                    const channels = follows.map(follow => getChannelFromJSON(follow)),
	                          newChannels = channels.filter(channel => usr.favorites.some(ch => ch.login == channel.login));
	                    if (newChannels.length > 0) {
	                        usr.favorites = channels.map(channel => channel.login);
	                    }
	                    (0, _utils.emit)(this, "updateduser", usr);
	                    (0, _utils.emit)(this, "newchannels", newChannels);
	                });
	            }
	        });
	    }
	    updateRequest(channels) {
	        const urls = channels.map(channel => baseURL + channel.login);
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, data => {
	            if (data.parsedJSON && "id" in data.parsedJSON) {
	                const channel = getChannelFromJSON(data.parsedJSON);

	                this._getChannelStatus(data.parsedJSON, channel).then(channel => {
	                    (0, _utils.emit)(this, "updatedchannels", channel);
	                });
	            }
	        });
	    }
	    updateChannel(channelname) {
	        var _this3 = this;

	        return _asyncToGenerator(function* () {
	            const data = yield _this3._qs.queueRequest(baseURL + channelname);

	            if (data.parsedJSON && "id" in data.parsedJSON) {
	                const channel = getChannelFromJSON(data.parsedJSON);

	                return _this3._getChannelStatus(data.parsedJSON, channel);
	            } else {
	                throw "Couldn't get details for the new livestream channel " + channelname;
	            }
	        })();
	    }
	}

	exports.default = Object.freeze(new NewLivestream(type));

/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _paginationHelper = __webpack_require__(14);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Streamup provider. API reverseengineering is in #114.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/streamup
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "streamup",
	      baseURL = 'https://api.streamup.com/v1/',
	      getUserFromJSON = (json, user = new _core.User(json.username, type)) => {
	    if (json.name !== "") {
	        user.uname = json.name;
	    }
	    user.image = {
	        64: json.avatar.small,
	        200: json.avatar.medium,
	        600: json.avatar.large
	    };
	    return user;
	},
	      getChannelFromJSON = json => {
	    let chan = new _core.Channel(json.username, type);
	    chan = getUserFromJSON(json, chan);
	    chan.url.push("https://streamup.com/" + json.slug);
	    chan.archiveUrl = "https://streamup.com/profile/" + json.slug;
	    chan.chatUrl = "https://streamup.com/" + json.slug + "/embeds/chat";
	    return chan;
	};

	class Streamup extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["https://streamup.com"], this._supportsFavorites = true, _temp;
	    }

	    getUserFavorites(username) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const [follows, userData] = yield Promise.all([(0, _paginationHelper.promisedPaginationHelper)({
	                url: baseURL + "users/" + username + "/following?page=",
	                initialPage: 1,
	                request: function (url) {
	                    return _this._qs.queueRequest(url);
	                },
	                fetchNextPage: function (data) {
	                    return data.parseJSON && data.parseJSON.next_page !== null;
	                },
	                getPageNumber: function (page) {
	                    return page + 1;
	                },
	                getItems: function (data) {
	                    if (data.parseJSON && "users" in data.parseJSON && data.parseJSON.users.length) {
	                        return data.parseJSON.users;
	                    } else {
	                        return [];
	                    }
	                }
	            }), _this._qs.queueRequest(baseURL + "users/" + username)]);

	            if (userData.parseJSON && "user" in userData.parseJSON) {
	                const channels = follows.map(getChannelFromJSON),
	                      user = getUserFromJSON(userData.parseJSON.user);
	                user.favorites = channels.map(function (chan) {
	                    return chan.login;
	                });

	                return [user, channels];
	            } else {
	                throw "Couldn't fetch favorites for user " + username + " for " + _this._type;
	            }
	        })();
	    }
	    getChannelDetails(channelname) {
	        return this._qs.queueRequest(baseURL + "channels/" + channelname).then(data => {
	            if (data.parseJSON && "channel" in data.parseJSON) {
	                const chan = getChannelFromJSON(data.parseJSON.channel.user);
	                chan.thumbnail = data.parseJSON.channel.snapshot.medium;
	                chan.live.setLive(data.parseJSON.channel.live);
	                chan.viewers = data.parseJSON.channel.live_viewers_count;
	                chan.title = data.parseJSON.channel.stream_title;

	                return chan;
	            } else {
	                throw "Couldn't get channel details for " + channelname + " on " + this._type;
	            }
	        });
	    }
	    updateFavsRequest(users) {
	        const urls = users.map(user => baseURL + "users/" + user.login);
	        this._qs.queueUpdateRequest(urls, this._qs.LOW_PRIORITY, data => {
	            if (data.parseJSON && "user" in data.parseJSON) {
	                const user = getUserFromJSON(data.parseJSON.user),
	                      oldUser = users.find(usr => usr.login == user.login);

	                user.id = oldUser.id;

	                new _paginationHelper.PaginationHelper({
	                    url: baseURL + "users/" + user.login + "/following?page=",
	                    initialPage: 1,
	                    request: url => this._qs.queueRequest(url),
	                    fetchNextPage: data => data.parseJSON && data.parseJSON.next_page !== null,
	                    getPageNumber: page => page + 1,
	                    getItems: data => {
	                        if (data.parseJSON && "users" in data.parseJSON && data.parseJSON.users.length) {
	                            return data.parseJSON.users;
	                        } else {
	                            return [];
	                        }
	                    },
	                    onComplete: follows => {
	                        user.favorites = follows.map(f => f.username);
	                        (0, _utils.emit)(this, "updateduser", user);

	                        const channels = follows.filter(f => oldUser.favorites.every(fav => fav !== f.username)).map(getChannelFromJSON);
	                        (0, _utils.emit)(this, "newchannels", channels);

	                        oldUser.favorites = user.favorites;
	                    }
	                });
	            }
	        });
	    }
	    updateRequest(channels) {
	        const urls = channels.map(chan => baseURL + "channels/" + chan.login);
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, data => {
	            if (data.parseJSON && "channel" in data.parseJSON) {
	                const chan = getChannelFromJSON(data.parseJSON.channel.user);
	                chan.thumbnail = data.parseJSON.channel.snapshot.medium;
	                chan.live.setLive(data.parseJSON.channel.live);
	                chan.viewers = data.parseJSON.channel.live_viewers_count;
	                chan.title = data.parseJSON.channel.stream_title;

	                (0, _utils.emit)(this, "updatedchannels", chan);
	            }
	        });
	    }
	}

	exports.default = Object.freeze(new Streamup(type));

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _core = __webpack_require__(13);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	var _md = __webpack_require__(32);

	var _md2 = _interopRequireDefault(_md);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * Douyutv provider. API reverseengineering is in #125.
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module providers/douyutv
	 * @todo support adding by url slug name
	 */
	const type = "douyutv",
	      baseURL = "http://www.douyutv.com/api/v1/",
	      roomURL = "http://www.douyutv.com",
	      getChannelFromJSON = json => {
	    const chan = new _core.Channel(json.room_id, type);
	    chan.uname = json.room_name;
	    chan.title = json.subject;
	    chan.url.push(roomURL + json.url);
	    chan.image = {
	        200: json.owner_avatar
	    };
	    chan.archiveUrl = roomURL + json.url;
	    chan.live.setLive(json.show_status == "1");
	    chan.thumbnail = json.room_src;
	    chan.category = json.game_name;
	    chan.viewers = json.online;
	    return chan;
	},
	      signAPI = (endpoint, id) => {
	    const argument = endpoint + id + "?aid=android&client_sys=android&time=" + Date.now(),
	          sign = (0, _md2.default)(argument + '1231');
	    return argument + "&auth=" + sign;
	};

	class Douyutv extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this.authURL = ["http://www.douyutv.com"], _temp;
	    }

	    getChannelDetails(username) {
	        return this._qs.queueRequest(baseURL + signAPI("room/", username)).then(data => {
	            if (data.parsedJSON && data.parsedJSON.error === 0) {
	                return getChannelFromJSON(data.parsedJSON.data);
	            } else {
	                throw "Couldn't get room info for douyutv channel with ID " + username;
	            }
	        });
	    }
	    updateRequest(channels) {
	        const urls = channels.map(ch => baseURL + signAPI("room/", ch.login));
	        this._qs.queueUpdateRequest(urls, this._qs.HIGH_PRIORITY, data => {
	            if (data.parsedJSON && data.parsedJSON.error === 0) {
	                (0, _utils.emit)(this, "updatedchannels", getChannelFromJSON(data.parsedJSON.data));
	            }
	        });
	    }
	}

	exports.default = Object.freeze(new Douyutv(type));

/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

	(function(){
	  var crypt = __webpack_require__(33),
	      utf8 = __webpack_require__(34).utf8,
	      isBuffer = __webpack_require__(35),
	      bin = __webpack_require__(34).bin,

	  // The core
	  md5 = function (message, options) {
	    // Convert to byte array
	    if (message.constructor == String)
	      if (options && options.encoding === 'binary')
	        message = bin.stringToBytes(message);
	      else
	        message = utf8.stringToBytes(message);
	    else if (isBuffer(message))
	      message = Array.prototype.slice.call(message, 0);
	    else if (!Array.isArray(message))
	      message = message.toString();
	    // else, assume byte array already

	    var m = crypt.bytesToWords(message),
	        l = message.length * 8,
	        a =  1732584193,
	        b = -271733879,
	        c = -1732584194,
	        d =  271733878;

	    // Swap endian
	    for (var i = 0; i < m.length; i++) {
	      m[i] = ((m[i] <<  8) | (m[i] >>> 24)) & 0x00FF00FF |
	             ((m[i] << 24) | (m[i] >>>  8)) & 0xFF00FF00;
	    }

	    // Padding
	    m[l >>> 5] |= 0x80 << (l % 32);
	    m[(((l + 64) >>> 9) << 4) + 14] = l;

	    // Method shortcuts
	    var FF = md5._ff,
	        GG = md5._gg,
	        HH = md5._hh,
	        II = md5._ii;

	    for (var i = 0; i < m.length; i += 16) {

	      var aa = a,
	          bb = b,
	          cc = c,
	          dd = d;

	      a = FF(a, b, c, d, m[i+ 0],  7, -680876936);
	      d = FF(d, a, b, c, m[i+ 1], 12, -389564586);
	      c = FF(c, d, a, b, m[i+ 2], 17,  606105819);
	      b = FF(b, c, d, a, m[i+ 3], 22, -1044525330);
	      a = FF(a, b, c, d, m[i+ 4],  7, -176418897);
	      d = FF(d, a, b, c, m[i+ 5], 12,  1200080426);
	      c = FF(c, d, a, b, m[i+ 6], 17, -1473231341);
	      b = FF(b, c, d, a, m[i+ 7], 22, -45705983);
	      a = FF(a, b, c, d, m[i+ 8],  7,  1770035416);
	      d = FF(d, a, b, c, m[i+ 9], 12, -1958414417);
	      c = FF(c, d, a, b, m[i+10], 17, -42063);
	      b = FF(b, c, d, a, m[i+11], 22, -1990404162);
	      a = FF(a, b, c, d, m[i+12],  7,  1804603682);
	      d = FF(d, a, b, c, m[i+13], 12, -40341101);
	      c = FF(c, d, a, b, m[i+14], 17, -1502002290);
	      b = FF(b, c, d, a, m[i+15], 22,  1236535329);

	      a = GG(a, b, c, d, m[i+ 1],  5, -165796510);
	      d = GG(d, a, b, c, m[i+ 6],  9, -1069501632);
	      c = GG(c, d, a, b, m[i+11], 14,  643717713);
	      b = GG(b, c, d, a, m[i+ 0], 20, -373897302);
	      a = GG(a, b, c, d, m[i+ 5],  5, -701558691);
	      d = GG(d, a, b, c, m[i+10],  9,  38016083);
	      c = GG(c, d, a, b, m[i+15], 14, -660478335);
	      b = GG(b, c, d, a, m[i+ 4], 20, -405537848);
	      a = GG(a, b, c, d, m[i+ 9],  5,  568446438);
	      d = GG(d, a, b, c, m[i+14],  9, -1019803690);
	      c = GG(c, d, a, b, m[i+ 3], 14, -187363961);
	      b = GG(b, c, d, a, m[i+ 8], 20,  1163531501);
	      a = GG(a, b, c, d, m[i+13],  5, -1444681467);
	      d = GG(d, a, b, c, m[i+ 2],  9, -51403784);
	      c = GG(c, d, a, b, m[i+ 7], 14,  1735328473);
	      b = GG(b, c, d, a, m[i+12], 20, -1926607734);

	      a = HH(a, b, c, d, m[i+ 5],  4, -378558);
	      d = HH(d, a, b, c, m[i+ 8], 11, -2022574463);
	      c = HH(c, d, a, b, m[i+11], 16,  1839030562);
	      b = HH(b, c, d, a, m[i+14], 23, -35309556);
	      a = HH(a, b, c, d, m[i+ 1],  4, -1530992060);
	      d = HH(d, a, b, c, m[i+ 4], 11,  1272893353);
	      c = HH(c, d, a, b, m[i+ 7], 16, -155497632);
	      b = HH(b, c, d, a, m[i+10], 23, -1094730640);
	      a = HH(a, b, c, d, m[i+13],  4,  681279174);
	      d = HH(d, a, b, c, m[i+ 0], 11, -358537222);
	      c = HH(c, d, a, b, m[i+ 3], 16, -722521979);
	      b = HH(b, c, d, a, m[i+ 6], 23,  76029189);
	      a = HH(a, b, c, d, m[i+ 9],  4, -640364487);
	      d = HH(d, a, b, c, m[i+12], 11, -421815835);
	      c = HH(c, d, a, b, m[i+15], 16,  530742520);
	      b = HH(b, c, d, a, m[i+ 2], 23, -995338651);

	      a = II(a, b, c, d, m[i+ 0],  6, -198630844);
	      d = II(d, a, b, c, m[i+ 7], 10,  1126891415);
	      c = II(c, d, a, b, m[i+14], 15, -1416354905);
	      b = II(b, c, d, a, m[i+ 5], 21, -57434055);
	      a = II(a, b, c, d, m[i+12],  6,  1700485571);
	      d = II(d, a, b, c, m[i+ 3], 10, -1894986606);
	      c = II(c, d, a, b, m[i+10], 15, -1051523);
	      b = II(b, c, d, a, m[i+ 1], 21, -2054922799);
	      a = II(a, b, c, d, m[i+ 8],  6,  1873313359);
	      d = II(d, a, b, c, m[i+15], 10, -30611744);
	      c = II(c, d, a, b, m[i+ 6], 15, -1560198380);
	      b = II(b, c, d, a, m[i+13], 21,  1309151649);
	      a = II(a, b, c, d, m[i+ 4],  6, -145523070);
	      d = II(d, a, b, c, m[i+11], 10, -1120210379);
	      c = II(c, d, a, b, m[i+ 2], 15,  718787259);
	      b = II(b, c, d, a, m[i+ 9], 21, -343485551);

	      a = (a + aa) >>> 0;
	      b = (b + bb) >>> 0;
	      c = (c + cc) >>> 0;
	      d = (d + dd) >>> 0;
	    }

	    return crypt.endian([a, b, c, d]);
	  };

	  // Auxiliary functions
	  md5._ff  = function (a, b, c, d, x, s, t) {
	    var n = a + (b & c | ~b & d) + (x >>> 0) + t;
	    return ((n << s) | (n >>> (32 - s))) + b;
	  };
	  md5._gg  = function (a, b, c, d, x, s, t) {
	    var n = a + (b & d | c & ~d) + (x >>> 0) + t;
	    return ((n << s) | (n >>> (32 - s))) + b;
	  };
	  md5._hh  = function (a, b, c, d, x, s, t) {
	    var n = a + (b ^ c ^ d) + (x >>> 0) + t;
	    return ((n << s) | (n >>> (32 - s))) + b;
	  };
	  md5._ii  = function (a, b, c, d, x, s, t) {
	    var n = a + (c ^ (b | ~d)) + (x >>> 0) + t;
	    return ((n << s) | (n >>> (32 - s))) + b;
	  };

	  // Package private blocksize
	  md5._blocksize = 16;
	  md5._digestsize = 16;

	  module.exports = function (message, options) {
	    if (message === undefined || message === null)
	      throw new Error('Illegal argument ' + message);

	    var digestbytes = crypt.wordsToBytes(md5(message, options));
	    return options && options.asBytes ? digestbytes :
	        options && options.asString ? bin.bytesToString(digestbytes) :
	        crypt.bytesToHex(digestbytes);
	  };

	})();


/***/ },
/* 33 */
/***/ function(module, exports) {

	(function() {
	  var base64map
	      = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',

	  crypt = {
	    // Bit-wise rotation left
	    rotl: function(n, b) {
	      return (n << b) | (n >>> (32 - b));
	    },

	    // Bit-wise rotation right
	    rotr: function(n, b) {
	      return (n << (32 - b)) | (n >>> b);
	    },

	    // Swap big-endian to little-endian and vice versa
	    endian: function(n) {
	      // If number given, swap endian
	      if (n.constructor == Number) {
	        return crypt.rotl(n, 8) & 0x00FF00FF | crypt.rotl(n, 24) & 0xFF00FF00;
	      }

	      // Else, assume array and swap all items
	      for (var i = 0; i < n.length; i++)
	        n[i] = crypt.endian(n[i]);
	      return n;
	    },

	    // Generate an array of any length of random bytes
	    randomBytes: function(n) {
	      for (var bytes = []; n > 0; n--)
	        bytes.push(Math.floor(Math.random() * 256));
	      return bytes;
	    },

	    // Convert a byte array to big-endian 32-bit words
	    bytesToWords: function(bytes) {
	      for (var words = [], i = 0, b = 0; i < bytes.length; i++, b += 8)
	        words[b >>> 5] |= bytes[i] << (24 - b % 32);
	      return words;
	    },

	    // Convert big-endian 32-bit words to a byte array
	    wordsToBytes: function(words) {
	      for (var bytes = [], b = 0; b < words.length * 32; b += 8)
	        bytes.push((words[b >>> 5] >>> (24 - b % 32)) & 0xFF);
	      return bytes;
	    },

	    // Convert a byte array to a hex string
	    bytesToHex: function(bytes) {
	      for (var hex = [], i = 0; i < bytes.length; i++) {
	        hex.push((bytes[i] >>> 4).toString(16));
	        hex.push((bytes[i] & 0xF).toString(16));
	      }
	      return hex.join('');
	    },

	    // Convert a hex string to a byte array
	    hexToBytes: function(hex) {
	      for (var bytes = [], c = 0; c < hex.length; c += 2)
	        bytes.push(parseInt(hex.substr(c, 2), 16));
	      return bytes;
	    },

	    // Convert a byte array to a base-64 string
	    bytesToBase64: function(bytes) {
	      for (var base64 = [], i = 0; i < bytes.length; i += 3) {
	        var triplet = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
	        for (var j = 0; j < 4; j++)
	          if (i * 8 + j * 6 <= bytes.length * 8)
	            base64.push(base64map.charAt((triplet >>> 6 * (3 - j)) & 0x3F));
	          else
	            base64.push('=');
	      }
	      return base64.join('');
	    },

	    // Convert a base-64 string to a byte array
	    base64ToBytes: function(base64) {
	      // Remove non-base-64 characters
	      base64 = base64.replace(/[^A-Z0-9+\/]/ig, '');

	      for (var bytes = [], i = 0, imod4 = 0; i < base64.length;
	          imod4 = ++i % 4) {
	        if (imod4 == 0) continue;
	        bytes.push(((base64map.indexOf(base64.charAt(i - 1))
	            & (Math.pow(2, -2 * imod4 + 8) - 1)) << (imod4 * 2))
	            | (base64map.indexOf(base64.charAt(i)) >>> (6 - imod4 * 2)));
	      }
	      return bytes;
	    }
	  };

	  module.exports = crypt;
	})();


/***/ },
/* 34 */
/***/ function(module, exports) {

	var charenc = {
	  // UTF-8 encoding
	  utf8: {
	    // Convert a string to a byte array
	    stringToBytes: function(str) {
	      return charenc.bin.stringToBytes(unescape(encodeURIComponent(str)));
	    },

	    // Convert a byte array to a string
	    bytesToString: function(bytes) {
	      return decodeURIComponent(escape(charenc.bin.bytesToString(bytes)));
	    }
	  },

	  // Binary encoding
	  bin: {
	    // Convert a string to a byte array
	    stringToBytes: function(str) {
	      for (var bytes = [], i = 0; i < str.length; i++)
	        bytes.push(str.charCodeAt(i) & 0xFF);
	      return bytes;
	    },

	    // Convert a byte array to a string
	    bytesToString: function(bytes) {
	      for (var str = [], i = 0; i < bytes.length; i++)
	        str.push(String.fromCharCode(bytes[i]));
	      return str.join('');
	    }
	  }
	};

	module.exports = charenc;


/***/ },
/* 35 */
/***/ function(module, exports) {

	/*!
	 * Determine if an object is a Buffer
	 *
	 * @author   Feross Aboukhadijeh <feross@feross.org> <http://feross.org>
	 * @license  MIT
	 */

	// The _isBuffer check is for Safari 5-7 support, because it's missing
	// Object.prototype.constructor. Remove this eventually
	module.exports = function (obj) {
	  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer)
	}

	function isBuffer (obj) {
	  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj)
	}

	// For Node v0.10 support. Remove this eventually.
	function isSlowBuffer (obj) {
	  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0))
	}


/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _genericProvider = __webpack_require__(15);

	var _genericProvider2 = _interopRequireDefault(_genericProvider);

	var _core = __webpack_require__(13);

	var _paginationHelper = __webpack_require__(14);

	var _querystring = __webpack_require__(12);

	var _querystring2 = _interopRequireDefault(_querystring);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Dailymotion provider.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module providers/dailymotion
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const type = "dailymotion",
	      baseUrl = "https://api.dailymotion.com/",
	      AVATAR_SIZES = [25, 60, 80, 120, 190, 240, 360, 480, 720],
	      USER_FIELDS = "screenname,url,id," + AVATAR_SIZES.map(s => "avatar_" + s + "_url").join(","),
	      getChannelFromJSON = (json, doUser = false) => {
	    let ch;
	    if (doUser) {
	        ch = new _core.User(json.id, type);
	    } else {
	        ch = new _core.Channel(json.id, type);
	        ch.url.push(json.url);
	        ch.archiveUrl = json.url;
	    }
	    ch.uname = json.screenname;
	    ch.image = AVATAR_SIZES.reduce((p, c) => {
	        p[c] = json['avatar_' + c + '_url'];
	        return p;
	    }, {});

	    return ch;
	};

	class Dailymotion extends _genericProvider2.default {
	    constructor(...args) {
	        var _temp;

	        return _temp = super(...args), this._supportsFavorites = true, this._supportsFeatured = true, _temp;
	    }

	    _getChannelByID(id, doUser = false) {
	        return this._qs.queueRequest(baseUrl + "user/" + id + "?" + _querystring2.default.stringify({
	            fields: USER_FIELDS
	        })).then(result => {
	            if (result.ok && result.parsedJSON) {
	                if ("list" in result.parsedJSON) {
	                    return getChannelFromJSON(result.parsedJSON.list[0], doUser);
	                } else {
	                    return getChannelFromJSON(result.parsedJSON, doUser);
	                }
	            } else {
	                throw `Could not get details for ${ id } on ${ this._type }`;
	            }
	        });
	    }
	    _getStreamDetailsForChannel(channel) {
	        return this._qs.queueRequest(baseUrl + "user/" + channel.login + "/videos?" + _querystring2.default.stringify({
	            id: channel.login,
	            fields: "chat_embed_url,title,url,channel.name,onair,thumbnail_240_url",
	            sort: "live-audience",
	            limit: 1
	        })).then(response => {
	            if (response.ok && response.parsedJSON) {
	                if (response.parsedJSON.list.length) {
	                    const item = response.parsedJSON.list[0];
	                    channel.chatUrl = item.chat_embed_url;
	                    channel.thumbnail = item.thumbnail_url;
	                    channel.url = [item.url];
	                    channel.category = item['channel.name'];
	                    channel.live.setLive(item.onair);
	                    channel.title = item.title;
	                } else {
	                    channel.live.setLive(false);
	                }
	                return channel;
	            } else {
	                throw `Could not update ${ channel.login } on ${ this._type }`;
	            }
	        });
	    }
	    _getFavs(userId) {
	        return (0, _paginationHelper.promisedPaginationHelper)({
	            url: baseUrl + "user/" + userId + "/following?" + _querystring2.default.stringify({
	                fields: USER_FIELDS,
	                limit: 100
	            }) + "&page=",
	            pageSize: 1,
	            initialPage: 1,
	            request: url => this._qs.queueRequest(url),
	            fetchNextPage(data) {
	                return data.json && data.parsedJSON.has_more;
	            },
	            getItems(data) {
	                if (data.ok && data.parsedJSON && data.parsedJSON.list) {
	                    return data.parsedJSON.list.map(getChannelFromJSON);
	                } else {
	                    return [];
	                }
	            }
	        });
	    }
	    getUserFavorites(username) {
	        return this.getChannelDetails(username, true).then(user => {
	            return this._getFavs(user.login).then(channels => {
	                user.favorites = channels.map(ch => ch.login);

	                return [user, channels];
	            });
	        });
	    }
	    getChannelDetails(username, doUser = false) {
	        return this._qs.queueRequest(baseUrl + "users?" + _querystring2.default.stringify({
	            usernames: username,
	            fields: USER_FIELDS
	        }), {}).then(result => {
	            if (result.ok && result.parsedJSON && result.parsedJSON.list && result.parsedJSON.list.length) {
	                return getChannelFromJSON(result.parsedJSON.list[0], doUser);
	            } else {
	                return this._getChannelByID(username, doUser);
	            }
	        });
	    }
	    updateFavsRequest(users) {
	        new _paginationHelper.PaginationHelper({
	            url: baseUrl + "users?" + _querystring2.default.stringify({
	                ids: users.map(ch => ch.login).join(","),
	                fields: USER_FIELDS,
	                limit: 100
	            }) + "&page=",
	            initialPage: 1,
	            pageSize: 1,
	            request: (url, callback, initial) => {
	                if (initial) {
	                    this._qs.queueUpdateRequest([url], this._qs.LOW_PRIORITY, callback);
	                } else {
	                    return this._qs.queueRequest(url);
	                }
	            },
	            fetchNextPage(data) {
	                return data.parsedJSON && data.parsedJSON.has_more;
	            },
	            getItems(data) {
	                if (data.ok && data.parsedJSON && data.parsedJSON.list) {
	                    return data.parsedJSON.list;
	                } else {
	                    return [];
	                }
	            },
	            onComplete: data => {
	                data = data.map(d => getChannelFromJSON(d, true));

	                data.forEach(user => {
	                    const oldUser = users.find(u => u.login == user.login);
	                    this._getFavs(user.login).then(channels => {
	                        user.favorites = channels.map(ch => ch.login);
	                        (0, _utils.emit)(this, "updateduser", user);

	                        channels = channels.filter(ch => !oldUser.favorites.some(c => c == ch.login));
	                        (0, _utils.emit)(this, "newchannels", channels);

	                        oldUser.favorites = user.favorites;
	                    });
	                });
	            }
	        });
	    }
	    updateRequest(channels) {
	        new _paginationHelper.PaginationHelper({
	            url: baseUrl + "users?" + _querystring2.default.stringify({
	                ids: channels.map(ch => ch.login).join(","),
	                fields: USER_FIELDS,
	                limit: 100
	            }) + "&page=",
	            initialPage: 1,
	            pageSize: 1,
	            request: (url, callback, initial) => {
	                if (initial) {
	                    this._qs.queueUpdateRequest([url], this._qs.HIGH_PRIORITY, callback);
	                } else {
	                    return this._qs.queueRequest(url);
	                }
	            },
	            fetchNextPage(data) {
	                return data.parsedJSON && data.parsedJSON.has_more;
	            },
	            getItems(data) {
	                if (data.ok && data.parsedJSON && data.parsedJSON.list) {
	                    return data.parsedJSON.list;
	                } else {
	                    return [];
	                }
	            },
	            onComplete: data => {
	                data = data.map(v => getChannelFromJSON(v));

	                Promise.all(data.map(ch => this._getStreamDetailsForChannel(ch))).then(channels => (0, _utils.emit)(this, "updatedchannels", channels));
	            }
	        });
	    }
	    updateChannel(username) {
	        return this.getChannelDetails(username).then(channel => {
	            return this._getStreamDetailsForChannel(channel);
	        });
	    }
	    updateChannels(channels) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const response = yield (0, _paginationHelper.promisedPaginationHelper)({
	                url: baseUrl + "users?" + _querystring2.default.stringify({
	                    ids: channels.map(function (ch) {
	                        return ch.login;
	                    }).join(","),
	                    fields: USER_FIELDS,
	                    limit: 100
	                }) + "&page=",
	                pageSize: 1,
	                initialPage: 1,
	                request: function (url) {
	                    return _this._qs.queueRequest(url);
	                },
	                fetchNextPage(data) {
	                    return data.parsedJSON && data.parsedJSON.has_more;
	                },
	                getItems(data) {
	                    if (data.parsedJSON && data.parsedJSON.list) {
	                        return data.parsedJSON.list;
	                    } else {
	                        return [];
	                    }
	                }
	            });

	            return Promise.all(response.map(function (ch) {
	                return _this._getStreamDetailsForChannel(getChannelFromJSON(ch));
	            }));
	        })();
	    }
	    search(query) {
	        const q = {
	            fields: "owner.id,owner.screenname,owner.url,chat_embed_url,title,url,channel.name,thumbnail_240_url," + AVATAR_SIZES.map(s => "owner.avatar_" + s + "_url").join(","),
	            sort: "live-audience",
	            "live_onair": 1
	        };
	        if (query) {
	            q.search = query;
	        }
	        return this._qs.queueRequest(baseUrl + "videos?" + _querystring2.default.stringify(q)).then(data => {
	            if (data.ok && data.parsedJSON && data.parsedJSON.list && data.parsedJSON.list.length) {
	                return data.parsedJSON.list.map(json => {
	                    const ch = new _core.Channel(json['owner.id'], this._type);
	                    ch.live.setLive(true);
	                    ch.title = json.title;
	                    ch.uname = json['owner.screenname'];
	                    ch.url.push(json.url, json['owner.url']);
	                    ch.archiveUrl = json['owner.url'];
	                    ch.chatUrl = json.chat_embed_url;
	                    ch.category = json['channel.name'];
	                    ch.thumbnail = json.thumbnail_240_url;
	                    ch.image = AVATAR_SIZES.reduce((p, s) => {
	                        p[s] = json['owner.avatar_' + s + '_url'];
	                        return p;
	                    }, {});

	                    return ch;
	                });
	            } else {
	                throw "Didn't find any search results channels with " + query + " for " + this._type;
	            }
	        });
	    }
	}

	exports.default = Object.freeze(new Dailymotion(type));

/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	const MANAGER_URL = browser.runtime.getURL("manager/index.html");

	/**
	 * Store a channel. Listeners should call
	 * {@link module:channel/manager.ChannelsManager#onChannelAdded} once the
	 * channel was added.
	 *
	 * @event module:channel/manager.ChannelsManager#addchannel
	 * @type {string}
	 */
	/**
	 * Remove a channel (given by its ID) and all users that have it as favorite.
	 * Listeners should call
	 * {@link module:channel/manager.ChannelsManager#onChannelRemoved} once the
	 * channel has been removed.
	 *
	 * @event module:channel/manager.ChannelsManager#removechannel
	 * @type {number}
	 */
	/**
	 * Update a channel (given by its ID). Listeners shoudl call
	 * {@link module:channel/manager.ChannelsManager#onChannelUpdated} once the
	 * channels has been updated.
	 *
	 * @event module:channel/manager.ChannelsManager#updatechannel
	 * @type {number}
	 */
	/**
	 * Store a user. Listeners should call
	 * {@link module:channel/manager.ChannelsManager#onUserAdded} once the user has
	 * been added.
	 *
	 * @event module:channel/manager.ChannelsManager#adduser
	 * @type {string}
	 */
	/**
	 * Remove a user (given by it ID). If the second argument is true, delete all
	 * its favorited channels, too. Listeners should call
	 * {@link module:channel/manager.ChannelsManager#onUserRemoved} once the user
	 * was removed.
	 *
	 * @event module:channel/manager.ChannelsManager#removeuser
	 * @type {number}
	 */
	/**
	 * Update the favorites of the given user (by ID) or all users, if no ID was
	 * specified. Should call the approriate update callbacks on the ChannelsManager
	 * once done.
	 *
	 * @event module:channel/manager.ChannelsManager#updatefavorites
	 * @type {number}
	 */
	/**
	 * Search for accounts of the user on supported sites.
	 *
	 * @event module:channel/manager.ChannelsManager#autoadd
	 *
	 */
	/**
	 * Add all existing channels and users via the on callbacks.
	 *
	 * @event module:channel/manager.ChannelsManager#getdata
	 */
	/**
	 * Shift clicked help button to export debug info.
	 *
	 * @event module:channel/manager.ChannelsManager#debugdump
	 */
	/**
	 * Show add-on options.
	 *
	 * @event module:channel/manager.ChannelsManager#showoptions
	 */

	/**
	 * @class
	 * @extends external:EventEmitter
	 */
	/**
	 * Model for the channels manager component.
	 *
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module channel/manager
	 */
	class ChannelsManager extends EventEmitter {
	    /**
	     * @constructs
	     * @fires module:channel/manager.ChannelsManager#addchannel
	     * @fires module:channel/manager.ChannelsManager#removechannel
	     * @fires module:channel/manager.ChannelsManager#updatechannel
	     * @fires module:channel/manager.ChannelsManager#adduser
	     * @fires module:channel/manager.ChannelsManager#removeuser
	     * @fires module:channel/manager.ChannelsManager#updatefavorites
	     * @fires module:channel/manager.ChannelsManager#autoadd
	     * @fires module:channel/manager.ChannelsManager#getdata
	     * @fires module:channel/manager.ChannelsManager#debugdump
	     * @fires module:channel/manager.ChannelsManager#showoptions
	     */
	    constructor() {
	        super();

	        this._loading = true;
	        this.port = null;
	        this.tabID = null;
	        this.cancelingValues = new Map();

	        browser.runtime.onConnect.addListener(port => {
	            if (port.name == "manager") {
	                this._setupPort(port);
	            }
	        });

	        //TODO search for existing channel managers
	        browser.tabs.query({
	            url: MANAGER_URL + "*"
	        }).then(tabs => {
	            if (tabs.length) {
	                this.tabID = tabs[0];
	            }
	        });

	        browser.tabs.onUpdated.addListener((tabID, changeInfo, tag) => {
	            if (tabID === this.tabID && "url" in changeInfo && !changeInfo.url.startsWith(MANAGER_URL)) {
	                this.tabID = null;
	                this.port = null;
	            } else if (this.tabID == null && "url" in changeInfo && changeInfo.url.startsWith(MANAGER_URL)) {
	                this.tabID = tabID;
	            }
	        });

	        browser.tabs.onRemoved.addListener(tabID => {
	            if (tabID === this.tabID) {
	                this.tabID = null;
	            }
	        });
	    }
	    /**
	     * @type {boolean}
	     * @private
	     */
	    get loading() {
	        return this._loading;
	    }
	    set loading(val) {
	        if (this._loading != val) {
	            this._loading = val;
	            if (this.worker) {
	                if (val) {
	                    this.worker.port.emit("isloading");
	                } else {
	                    this.worker.port.emit("doneloading");
	                }
	            }
	        }
	    }
	    _setupPort() {
	        console.log("[Manager]> Attached");
	        const isSecondary = this.port !== null;

	        if (!isSecondary) {
	            this.port = port;
	            this.loading = true;
	        }

	        port.onMessage.addListener(message => {
	            if (message.target == "ready") {
	                if (isSecondary) {
	                    this._emitToWorker("secondary");
	                } else {
	                    console.log("[Manager]> Page ready");
	                    (0, _utils.emit)(this, "getdata");
	                }
	            } else if (isSecondary && message.target == "focus") {
	                if (this.tabID !== null) {
	                    this.open();
	                } else {
	                    this._emitToWorker("reload");
	                }
	            } else if (message.target == "adduser") {
	                if (message.username !== null) {
	                    this.loading = true;
	                    this.cancelingValues.set("user" + message.type + message.username, false);
	                    (0, _utils.emit)(this, "adduser", message.username, message.type, () => this.cancelingValues.get("user" + message.type + messsage.username));
	                }
	            } else if (message.target == "autoadd") {
	                this.loading = true;
	                (0, _utils.emit)(this, "autoadd");
	            } else if (message.target == "addchannel") {
	                if (message.username !== null) {
	                    this.loading = true;
	                    this.cancelingValues.set("channel" + message.type + message.username, false);
	                    (0, _utils.emit)(this, "addchannel", message.username, message.type, () => this.cancelingValues.get("channel" + message.type + message.username));
	                }
	            } else if (message.target == "cancel") {
	                this.loading = false;
	                this.cancelingValues.set(message.values.join(""), true);
	            } else if (message.target == "removechannel") {
	                (0, _utils.emit)(this, "removechannel", message.channelId);
	            }
	            if (message.target == "removeuser") {
	                (0, _utils.emit)(this, "removeuser", message.userId, message.removeFavorites);
	            }
	            if (message.target == "updatechannel") {
	                this.loading = true;
	                (0, _utils.emit)(this, "updatechannel", message.channelId);
	            } else if (message.target == "updatefavorites") {
	                this.loading = true;
	                (0, _utils.emit)(this, "updatefavorites", message.userId);
	            } else if (message.target == "debugdump" || message.target == "showoptions") {
	                (0, _utils.emit)(this, message.target);
	            }
	        });
	    }
	    /**
	     * Cleans up the canceling value for a request.
	     *
	     * @param {string} type - Object type (user or channel).
	     * @param {string} provider - Object provider name.
	     * @param {string} name - Object login.
	     */
	    _deleteCancelingValue(type, provider, name) {
	        this.cancelingValues.delete(type + provider + name);
	    }
	    /**
	     * Only emits to the worker if it actually exists (isn't null).
	     *
	     * @param {string} target - Name of the event to emit.
	     * @param {?} data - Data to send.
	     */
	    _emitToWorker(target, ...data) {
	        if (this.port !== null) {
	            this.port.postMessage({
	                target,
	                data
	            });
	        }
	    }
	    /**
	     * Selects a manager tab, if one's already opened, else opens one.
	     *
	     * @async
	     * @returns {?} The tab with the channels manager.
	     */
	    open() {
	        if (this.tabID === null) {
	            return browser.tabs.open({
	                url: "./channels-manager.html"
	            }).then(tab => {
	                this.tabID = tab.id;
	                return tab;
	            });
	        } else {
	            return browser.tabs.update(this.tabID, {
	                active: true
	            });
	        }
	    }
	    /**
	     * Add providers to the list of available providers in the manager.
	     *
	     * @param {Object.<module:providers/generic-provider.GenericProvider>} providers
	     *                                  - Availabe providers in serialized form.
	     */
	    addProviders(providers) {
	        this._emitToWorker("addproviders", providers);
	    }
	    /**
	     * Event callback if a channel was added. Callers should call
	     * _deleteCancelingValue if invoked from the manager.
	     *
	     * @param {module:channel/core.Channel} channelObj - The added channel.
	     */
	    onChannelAdded(channelObj) {
	        this.loading = false;
	        this._emitToWorker("add", channelObj.serialize());
	    }
	    /**
	     * Callback when a channel was removed.
	     *
	     * @param {number} channelId - ID of the removed channel.
	     */
	    onChannelRemoved(channelId) {
	        this._emitToWorker("remove", channelId);
	    }
	    /**
	     * Callback when a channel was updated.
	     *
	     * @param {module:channel/core.Channel} channelObj - The updated channel.
	     */
	    onChannelUpdated(channelObj) {
	        this.loading = false;
	        this._emitToWorker("update", channelObj.serialize());
	    }
	    /**
	     * Callback when a user was added. Callers should call _deleteCancelingValue
	     * if invoked from the manager.
	     *
	     * @param {module:channel/core.User} user - The added user.
	     */
	    onUserAdded(user) {
	        this.loading = false;
	        this._emitToWorker("adduser", user.serialize());
	    }
	    /**
	     * Callback when a user was removed.
	     *
	     * @param {number} userId - The ID of the removed user.
	     */
	    onUserRemoved(userId) {
	        this._emitToWorker("removeuser", userId);
	    }
	    /**
	     * Callback when a user was updated.
	     *
	     * @param {module:channel/core.User} user - The user that was updated.
	     */
	    onUserUpdated(user) {
	        this.loading = false;
	        this._emitToWorker("updateuser", user.serialize());
	    }
	    /**
	     * Callback when an error occurs while adding something.
	     *
	     * @param {string} [name] - Name of the object that was to be added.
	     * @param {string} [type] - Type of the object that was to be added.
	     * @param {string} [itemType] - Type of the object that had an error
	     *                            (user/channel).
	     */
	    onError(name, type, itemType) {
	        this.loading = false;
	        if (name) {
	            this._deleteCancelingValue(itemType, type, name);
	            //TODO move i18n to content
	            this._emitToWorker("error", name, type);
	        } else {
	            this._emitToWorker("error");
	        }
	    }
	    onCancel(name, type, itemType) {
	        this.loading = false;
	        this._deleteCancelingValue(itemType, type, name);
	    }

	    setTheme(theme) {
	        this._emitToWorker("theme", theme);
	    }
	}
	exports.default = ChannelsManager;

/***/ },
/* 38 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _core = __webpack_require__(13);

	var _liveState = __webpack_require__(5);

	var _liveState2 = _interopRequireDefault(_liveState);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Channel list Object.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module channel/list
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @requires module:channel/core
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */
	// setup event handling


	/**
	 * IndexedDB version.
	 *
	 * @const {number}
	 * @default 2
	 */
	const VERSION = 2,


	/**
	 * Database name.
	 *
	 * @const {string}
	 * @default "channellist"
	 */
	NAME = "channellist";

	/**
	 * The ChannelList is ready to be used.
	 *
	 * @event module:channel/list.ChannelList#ready
	 */
	/**
	 * Whenever one or more channels are added to the ChannelList this event is
	 * fired.
	 *
	 * @event module:channel/list.ChannelList#channelsadded
	 * @type {Array.<module:channel/core.Channel>}
	 */
	/**
	 * Whenever a user is added to the ChannelList this event is fired.
	 *
	 * @event module:channel/list.ChannelList#useradded
	 * @type {module:channel/core.User}
	 */
	/**
	 * @event module:channel/list.ChannelList#channelupdated
	 * @type {module:channel/core.Channel}
	 */
	/**
	 * @event module:channel/list.ChannelList#userupdated
	 * @type {module:channel/core.User}
	 */
	/**
	 * Gets fired before a channel is deleted.
	 *
	 * @event module:channel/list.ChannelList#beforechanneldeleted
	 * @type {number}
	 */
	/**
	 * Gets fired after a channel was deleted.
	 *
	 * @event module:channel/list.ChannelList#channeldeleted
	 * @type {module:channel/core.Channel}
	 */
	/**
	 * @event module:channel/list.ChannelList#userdeleted
	 * @type {module:channel/core.User}
	 */
	/**
	 * Fired when all content of the ChannelList is removed. If the first argument
	 * is true, the whole DB has been deleted and recreated, most likely to fix it.
	 *
	 * @event module:channel/list.ChannelList#clear
	 * @type {boolean}
	 */
	/**
	 * The database could not be repaired.
	 *
	 * @event module:channel/list.ChannelList#unfixableerror
	 */
	/**
	 * The datbase was fixed, but all the content was list in the process. User
	 * might want to re-add content.
	 *
	 * @event module:channel/list.ChannelList#fixdb
	 */

	/**
	 * @class module:channel/list.ChannelList
	 * @extends external:EventTarget
	 */
	class ChannelList extends EventTarget {
	    /**
	     * @constructs
	     * @fires module:channel/list.ChannelList#ready
	     */

	    /**
	     * Reference to the DB
	     *
	     * @type {IndexedDB?}
	     */
	    constructor() {
	        super();

	        this.db = null;
	        this._openingDB = null;
	        this.openDB(NAME);
	    }

	    /**
	     * Opens the DB, initializes the schema if it's a new DB or sets channels
	     * offline that were online and have last been updated a certain time ago.
	     *
	     * @param {string} name - Name of the DB to open.
	     * @param {boolean} [dontTry=false] - Don't try to fix the DB.
	     * @async
	     * @fires module:channel/list.ChannelList#ready
	     * @fires module:channel/list.ChannelList#fixdb
	     * @returns {undefined} The DB is ready.
	     * @throws Could not open the DB.
	     */

	    /**
	     * Holds a promise until the DB is being opened.
	     *
	     * @type {Promise?}
	     */
	    openDB(name, dontTry = false) {
	        console.log(`ChannelList.openDB(${ name },${ dontTry })`);
	        // Quick path if DB is already opened.
	        if (this.db) {
	            return Promise.resolve();
	        } else if (this._openingDB !== null) {
	            return this._openingDB;
	        }

	        this._openingDB = new Promise((resolve, reject) => {
	            // Try to open the DB
	            const request = window.indexedDB.open(name, VERSION);
	            request.onupgradeneeded = e => {
	                this.db = e.target.result;

	                const users = this.db.createObjectStore("users", { keyPath: "id", autoIncrement: true });
	                users.createIndex("typename", ["type", "login"], { unique: true });
	                users.createIndex("type", "type", { unique: false });
	                //users.createIndex("id", "id", { unique: true });
	                const channels = this.db.createObjectStore("channels", { keyPath: "id", autoIncrement: true });
	                channels.createIndex("typename", ["type", "login"], { unique: true });
	                channels.createIndex("type", "type", { unique: false });
	                //channels.createIndex("id", "id", { unique: true });
	            };

	            // DB is ready
	            request.onsuccess = e => {
	                this.db = e.target.result;

	                _preferences2.default.get("channellist_cacheTime").then(cacheTime => {
	                    // Set all channels to offline, that haven't been updated in a certain time.
	                    const transaction = this.db.transaction("channels", "readwrite"),
	                          store = transaction.objectStore("channels"),
	                          minDate = Date.now() - cacheTime,
	                          //now - 10 min
	                    req = store.index("typename").openCursor();

	                    req.onsuccess = event => {
	                        const cursor = event.target.result;

	                        if (cursor) {
	                            if (cursor.value.lastModified < minDate) {
	                                cursor.value.live.state = _liveState2.default.OFFLINE;
	                                cursor.update(cursor.value);
	                            }
	                            cursor.continue();
	                        } else {
	                            resolve();
	                            (0, _utils.emit)(this, "ready");
	                        }
	                    };
	                });
	            };

	            /* istanbul ignore next */
	            request.onerror = () => {
	                if (!dontTry) {
	                    if (this.db) {
	                        this.db.close();
	                        delete this.db;
	                    }
	                    resolve(this.clear().catch(e => {
	                        console.error("Couldn't delete the DB");
	                        (0, _utils.emit)(this, "unfixableerror");
	                        throw e;
	                    }));
	                } else {
	                    console.error(request.error);
	                    reject();
	                }
	            };
	        });
	        // Clear it once the promise is done.
	        this._openingDB.then(() => {
	            this._openingDB = null;
	        }, () => {
	            this._openingDB = null;
	        });
	        return this._openingDB;
	    }

	    /**
	     * Gets the ID of a channel, if it is in the ChannelList.
	     *
	     * @param {string} name - Login of the channel.
	     * @param {string} type - Type of the channel.
	     * @async
	     * @returns {number} The ID of the channel if it exists.
	     */
	    getChannelId(name, type) {
	        console.info("ChannelList.getChannelId(" + name + "," + type + ")");
	        return new Promise((resolve, reject) => {
	            const transaction = this.db.transaction("channels"),
	                  index = transaction.objectStore("channels").index("typename"),
	                  req = index.get([type, name]);
	            req.onsuccess = () => {
	                if (req.result) {
	                    resolve(req.result.id);
	                } else {
	                    reject();
	                }
	            };
	            req.onerror = reject;
	        });
	    }

	    /**
	     * Gets the ID of a user, if it is in the ChannelList.
	     *
	     * @param {string} name - Login of the user.
	     * @param {string} type - Type of the user.
	     * @async
	     * @returns {number} The ID of the user (if it exsits).
	     */
	    getUserId(name, type) {
	        return new Promise((resolve, reject) => {
	            const transaction = this.db.transaction("users"),
	                  index = transaction.objectStore("users").index("typename"),
	                  req = index.get([type, name]);
	            req.onsuccess = () => {
	                if (req.result) {
	                    resolve(req.result.id);
	                } else {
	                    reject();
	                }
	            };
	            req.onerror = reject;
	        });
	    }

	    /**
	     * Get the specified channel.
	     *
	     * @param {(number|string)} id - ID of login of the channel.
	     * @param {string} [type] - Type of the channel if a login was passed as
	     *                             first argument.
	     * @returns {module:channel/core.Channel}
	     * @throws The channel doesn't exist or no arguments passed.
	     */
	    getChannel(id, type) {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            console.info("ChannelList.getChannel(" + id + ")");
	            if (type) {
	                id = yield _this.getChannelId(id, type);
	            }
	            if (!id) {
	                throw "No ID specified";
	            }

	            return new Promise(function (resolve, reject) {
	                const transaction = _this.db.transaction("channels"),
	                      store = transaction.objectStore("channels"),
	                      req = store.get(id);

	                req.onsuccess = function () {
	                    if (req.result) {
	                        resolve(_core.Channel.deserialize(req.result));
	                    } else {
	                        reject();
	                    }
	                };
	                req.onerror = reject;
	            });
	        })();
	    }

	    /**
	     * Get the specified user.
	     *
	     * @param {(number|string)} id - ID of login of the user.
	     * @param {string} [type] - Type of the user if a login was passed as first
	     *                             argument.
	     * @returns {module:channel/core.User}
	     * @throws The user doesn't exist or no arguments passed.
	     */
	    getUser(id, type) {
	        var _this2 = this;

	        return _asyncToGenerator(function* () {
	            if (type) {
	                id = yield _this2.getUserId(id, type);
	            }

	            if (!id) {
	                throw "No ID specified";
	            }

	            return new Promise(function (resolve, reject) {
	                const transaction = _this2.db.transaction("users"),
	                      store = transaction.objectStore("users"),
	                      req = store.get(id);

	                req.onsuccess = function () {
	                    if (req.result) {
	                        resolve(_core.User.deserialize(req.result));
	                    } else {
	                        reject();
	                    }
	                };
	                req.onerror = reject;
	            });
	        })();
	    }

	    /**
	     * Add a channel to the list.
	     *
	     * @param {module:channel/core.Channel} channel - The channel to add.
	     * @throws {string} If the channel is already in the list.
	     * @fires module:channel/list.ChannelList#channelsadded
	     * @returns {module:channel/core.Channel} Added channel with the ID set.
	     */
	    addChannel(channel) {
	        var _this3 = this;

	        return _asyncToGenerator(function* () {
	            console.info("ChannelList.addChannel(" + channel.login + ")");
	            channel.lastModified = Date.now();

	            if (yield _this3.channelExists(channel.login, channel.type)) {
	                throw "Channel already exists";
	            }

	            return new Promise(function (resolve, reject) {
	                const transaction = _this3.db.transaction("channels", "readwrite"),
	                      store = transaction.objectStore("channels"),
	                      req = store.add(channel.serialize());

	                req.onsuccess = function () {
	                    channel.id = req.result;
	                    (0, _utils.emit)(_this3, "channelsadded", [channel]);
	                    resolve(channel);
	                };
	                req.onerror = reject;
	            });
	        })();
	    }

	    /**
	     * Add multiple channels to the list.
	     *
	     * @param {Array.<module:channel/core.Channel>} channels - The channels to add.
	     * @fires module:channel/list.ChannelList#channelsadded
	     * @async
	     * @returns {Array.<module:channel/core.Channel>} Added channels with their ID set.
	     */
	    addChannels(channels) {
	        console.info("ChannelList.addChannels(channels)");
	        if (channels instanceof _core.Channel) {
	            return this.addChannel(channels).then(channel => [channel]);
	        } else if (Array.isArray(channels)) {
	            if (channels.length == 1) {
	                return this.addChannel(channels[0]).then(channel => [channel]);
	            } else if (channels.length > 1) {
	                return new Promise(resolve => {
	                    const transaction = this.db.transaction("channels", "readwrite"),
	                          store = transaction.objectStore("channels"),
	                          index = store.index("typename"),
	                          addedChannels = [];
	                    channels.forEach((channel, i) => {
	                        const ireq = index.get([channel.type, channel.login]);
	                        ireq.onsuccess = () => {
	                            if (!ireq.result) {
	                                console.log("Adding channel " + channel.login);
	                                channel.lastModified = Date.now();
	                                const req = store.add(channel.serialize());
	                                req.onsuccess = () => {
	                                    channels[i].id = req.result;
	                                    addedChannels.push(channels[i]);
	                                };
	                                /* istanbul ignore next */
	                                req.onerror = () => {
	                                    console.error(req.error);
	                                };
	                            } else {
	                                console.log("Channel " + channel.login + " has already been added");
	                            }
	                        };
	                    }, this);
	                    transaction.oncomplete = () => {
	                        if (addedChannels.length > 0) {
	                            (0, _utils.emit)(this, "channelsadded", addedChannels);
	                        }
	                        resolve(addedChannels);
	                    };
	                });
	            }
	        }
	        return Promise.resolve([]);
	    }

	    /**
	     * Add a user to the list.
	     *
	     * @param {module:channel/core.User} user - The channel to add.
	     * @fires module:channel/list.ChannelList#useradded
	     * @returns {module:channel/core.User} The newly added User with ID.
	     */
	    addUser(user) {
	        var _this4 = this;

	        return _asyncToGenerator(function* () {
	            if (yield _this4.userExists(user.login, user.type)) {
	                throw "User already exists";
	            }

	            return new Promise(function (resolve, reject) {
	                const transaction = _this4.db.transaction("users", "readwrite"),
	                      store = transaction.objectStore("users"),
	                      req = store.add(user.serialize());

	                req.onsuccess = function () {
	                    user.id = req.result;
	                    resolve(user);
	                    (0, _utils.emit)(_this4, "useradded", user);
	                };
	                req.onerror = reject;
	            });
	        })();
	    }

	    /**
	     * Change the data of a channel.
	     *
	     * @param {module:channel/core.Channel} channel - The new data for the channel.
	     * @fires module:channel/list.ChannelList#channelupdated
	     * @returns {module:channel/core.Channel} The new version of the channel.
	     */
	    setChannel(channel) {
	        var _this5 = this;

	        return _asyncToGenerator(function* () {
	            console.info("ChannelList.setChannel(" + channel.id + ")");
	            if (!("id" in channel)) {
	                channel.id = yield _this5.getChannelId(channel.login, channel.type);
	            }

	            return new Promise(function (resolve, reject) {
	                const transaction = _this5.db.transaction("channels", "readwrite"),
	                      store = transaction.objectStore("channels");

	                channel.lastModified = Date.now();

	                const req = store.put(channel.serialize());

	                req.onsuccess = function () {
	                    _this5.getChannel(req.result).then(function (chan) {
	                        resolve(chan);
	                        (0, _utils.emit)(_this5, "channelupdated", chan);
	                    });
	                };
	                req.onerror = reject;
	            });
	        })();
	    }

	    /**
	     * Change the data of a user.
	     *
	     * @param {module:channel/core.User} user - The new data for the user.
	     * @fires module:channel/list.ChannelList#userupdated
	     * @returns {module:channel/core.User} The new version of the user stored
	     *                                      in the ChannelList.
	     */
	    setUser(user) {
	        var _this6 = this;

	        return _asyncToGenerator(function* () {
	            if (!("id" in user)) {
	                user.id = yield _this6.getUserId(user.login, user.type);
	            }
	            return new Promise(function (resolve, reject) {
	                const transaction = _this6.db.transaction("users", "readwrite"),
	                      store = transaction.objectStore("users"),
	                      req = store.put(user.serialize());

	                req.onsuccess = function () {
	                    resolve(_this6.getUser(req.result).then(function (usr) {
	                        (0, _utils.emit)(_this6, "userupdated", usr);
	                        return user;
	                    }));
	                };
	                req.onerror = reject;
	            });
	        })();
	    }

	    /**
	     * Remove a channel from the list. Also removes all users that have this channel
	     * as favorite.
	     *
	     * @param {(number|string)} id - ID or login of the channel to remove.
	     * @param {string} [type] - Type of the channel if no ID was passed.
	     * @fires module:channel/list.ChannelList#beforechanneldeleted
	     * @fires module:channel/list.ChannelList#channeldeleted
	     * @returns {module:channel/core.Channel} Resolves to the removed channel.
	     */
	    removeChannel(id, type) {
	        var _this7 = this;

	        return _asyncToGenerator(function* () {
	            console.info("ChannelList.removeChannel(" + id + ")");
	            if (type) {
	                id = yield _this7.getChannelId(id, type);
	            }

	            (0, _utils.emit)(_this7, "beforechanneldeleted", id);
	            const channel = yield _this7.getChannel(id);
	            yield Promise.all([_this7.removeUsersWithFavorite(id), new Promise(function (resolve, reject) {
	                const transaction = _this7.db.transaction("channels", "readwrite"),
	                      store = transaction.objectStore("channels"),
	                      req = store.delete(id);
	                console.log("queued deletion");

	                req.onsuccess = function () {
	                    resolve(channel);
	                    (0, _utils.emit)(_this7, "channeldeleted", channel);
	                };
	                req.onerror = reject;
	            })]);

	            return channel;
	        })();
	    }

	    /**
	     * Remove a user from the list.
	     *
	     * @param {(number|string)} id - ID or login of the user to remove.
	     * @param {string} [type] - Type of the user if no ID was passed.
	     * @fires module:channel/list.ChannelList#userdeleted
	     * @returns {module:channel/core.User} Resolves to the removed user.
	     */
	    removeUser(id, type) {
	        var _this8 = this;

	        return _asyncToGenerator(function* () {
	            const user = yield _this8.getUser(id, type);
	            return new Promise(function (resolve, reject) {
	                const transaction = _this8.db.transaction("users", "readwrite"),
	                      store = transaction.objectStore("users"),
	                      req = store.delete(user.id);

	                req.onsuccess = function () {
	                    resolve(user);
	                    (0, _utils.emit)(_this8, "userdeleted", user);
	                };
	                req.onerror = reject;
	            });
	        })();
	    }

	    /**
	     * Check if a channel is in the ChannelList.
	     *
	     * @param {(number|string)} id - ID or login of the channel.
	     * @param {string} [type] - Type of the channel if no ID was passed.
	     * @async
	     * @returns {boolean} Resolves to a boolean indicating if the channel exists.
	     */
	    channelExists(id, type) {
	        console.info("ChannelList.channelExists(", id, ",", type, ")");
	        return this.getChannel(id, type).then(channel => !!channel, () => false);
	    }

	    /**
	     * Check if a user is in the ChannelList.
	     *
	     * @param {(number|string)} id - ID or login of the user.
	     * @param {string} [type] - Type of the user if no ID was passed.
	     * @async
	     * @returns {boolean} Resolves to a boolean indicating if the user exists.
	     */
	    userExists(id, type) {
	        console.info("ChannelList.userExists(", id, ",", type, ")");

	        return this.getUser(id, type).then(channel => !!channel, () => false);
	    }

	    /**
	     * Get the live status of the ChannelList as a whole.
	     *
	     * @param {string} [type] - Check the live state of just the channels of the
	     *                             specified type.
	     * @todo make live an index and then get all the channels that are live and
	     *       count those. That should be slightly faster than this O(n)
	     *       operation on the array of all channels.
	     * @returns {boolean} Resolves to a boolean indicating, if there are any live
	     *                   channels.
	     */
	    liveStatus(type) {
	        var _this9 = this;

	        return _asyncToGenerator(function* () {
	            const channels = yield _this9.getChannelsByType(type);
	            return channels.some(function (channel) {
	                return channel.live.isLive();
	            });
	        })();
	    }

	    /**
	     * Get all channels with the specified type.
	     *
	     * @param {string} [type] - Type all the channels should have. If left out,
	     *                             all channels are returned.
	     * @async
	     * @returns {Array.<module:channel/core.Channel>}
	     */
	    getChannelsByType(type) {
	        return new Promise((resolve, reject) => {
	            const transaction = this.db.transaction("channels"),
	                  store = transaction.objectStore("channels"),
	                  retchans = [];

	            transaction.onerror = reject;

	            if (!type) {
	                store.index("typename").openCursor().onsuccess = event => {
	                    const cursor = event.target.result;

	                    if (cursor) {
	                        retchans.push(_core.Channel.deserialize(cursor.value));
	                        cursor.continue();
	                    } else {
	                        resolve(retchans);
	                    }
	                };
	            } else {
	                const keyRange = IDBKeyRange.only(type),
	                      index = store.index("type");

	                index.openCursor(keyRange).onsuccess = event => {
	                    const cursor = event.target.result;

	                    if (cursor) {
	                        retchans.push(_core.Channel.deserialize(cursor.value));
	                        cursor.continue();
	                    } else {
	                        resolve(retchans);
	                    }
	                };
	            }
	        });
	    }

	    /**
	     * Get all users in the ChannelList with a certain type.
	     *
	     * @param {string} [type] - The type all returned users should have. If left
	     *                             out all users are returned.
	     * @async
	     * @returns {Array.<module:channel/core.User>}
	     */
	    getUsersByType(type) {
	        return new Promise((resolve, reject) => {
	            const transaction = this.db.transaction("users"),
	                  store = transaction.objectStore("users"),
	                  retusrs = [];

	            transaction.onerror = reject;

	            if (!type) {
	                store.index("typename").openCursor().onsuccess = event => {
	                    const cursor = event.target.result;

	                    if (cursor) {
	                        retusrs.push(_core.User.deserialize(cursor.value));
	                        cursor.continue();
	                    } else {
	                        resolve(retusrs);
	                    }
	                };
	            } else {
	                const keyRange = IDBKeyRange.only(type),
	                      index = store.index("type");

	                index.openCursor(keyRange).onsuccess = event => {
	                    const cursor = event.target.result;

	                    if (cursor) {
	                        retusrs.push(_core.User.deserialize(cursor.value));
	                        cursor.continue();
	                    } else {
	                        resolve(retusrs);
	                    }
	                };
	            }
	        });
	    }

	    /**
	     * Get all users that have the given channel as a favorite.
	     *
	     * @param {module:channel/core.Channel} channel - Channel to search users's
	     *                                                  favorites for.
	     * @returns {Array.<module:channel/core.User>}
	     */
	    getUsersByFavorite(channel) {
	        var _this10 = this;

	        return _asyncToGenerator(function* () {
	            const users = yield _this10.getUsersByType(channel.type);
	            return users.filter(function (user) {
	                console.log("Scanning user " + user.login + " with the favorites " + user.favorites);
	                return user.favorites.indexOf(channel.login) !== -1;
	            });
	        })();
	    }

	    /**
	     * Remove all users that have the given channel as favorite.
	     *
	     * @param {number} channelId - ID of the channel that users have favorited.
	     * @fires module:channel/list.ChannelList#userdeleted
	     * @returns {Array.<module:channel/core.User>}
	     */
	    removeUsersWithFavorite(channelId) {
	        var _this11 = this;

	        return _asyncToGenerator(function* () {
	            const channel = yield _this11.getChannel(channelId);
	            const users = yield _this11.getUsersByFavorite(channel);
	            return Promise.all(users.map(function (user) {
	                console.log("Removing user " + user.login + " because he follows " + channel.login);
	                return _this11.removeUser(user.id);
	            }));
	        })();
	    }

	    /**
	     * Get all channels that are favorited by a user.
	     *
	     * @param {module:channel/core.User} user - User to get the favorites of.
	     * @returns {Array.<module:channel/core.Channel>}
	     */
	    getChannelsByUserFavorites(user) {
	        var _this12 = this;

	        return _asyncToGenerator(function* () {
	            const channels = yield _this12.getChannelsByType(user.type);
	            return channels.filter(function (channel) {
	                return user.favorites.some(function (channame) {
	                    return channame == channel.login;
	                });
	            });
	        })();
	    }

	    /**
	     * Remove all channels that are favorited by a user.
	     *
	     * @param {number} userId - ID of the user whose favorites should be removed.
	     * @fires module:channel/list.ChannelList#channeldeleted
	     * @fires module:channel/list.ChannelList#beforechanneldeleted
	     * @returns {Array.<module:channel/core.Channel>}
	     */
	    removeChannelsByUserFavorites(userId) {
	        var _this13 = this;

	        return _asyncToGenerator(function* () {
	            const user = yield _this13.getUser(userId),
	                  channels = yield _this13.getChannelsByUserFavorites(user);
	            return Promise.all(channels.map(function (channel) {
	                return _this13.removeChannel(channel.id);
	            }));
	        })();
	    }

	    /**
	     * Clear all contents of the ChannelList. Sometimes reinitializes the DB from
	     * scratch.
	     *
	     * @fires module:channel/list.ChannelList#clear
	     * @fires module:channel/list.ChannelList#ready
	     * @async
	     * @returns {boolean} If true the DB was deleted.
	     */
	    clear() {
	        console.info("ChannelList.clear");

	        const done = (hard = false) => {
	            (0, _utils.emit)(this, "clear", hard);
	            return Promise.resolve(hard);
	        };

	        if (this.db) {
	            console.info("Clearing object stores");
	            const transaction = this.db.transaction(["channels", "users"], "readwrite"),
	                  channels = transaction.objectStore("channels"),
	                  users = transaction.objectStore("users"),
	                  chanPromise = new Promise((resolve, reject) => {
	                const chanReq = channels.clear();
	                chanReq.onerror = reject;
	                chanReq.onsuccess = resolve;
	            }),
	                  usrPromise = new Promise((resolve, reject) => {
	                const usrReq = users.clear();
	                usrReq.onerror = reject;
	                usrReq.onsuccess = resolve;
	            });
	            return Promise.all([chanPromise, usrPromise]).then(() => done(false));
	        } else {
	            console.log("Deleting and reinitializing the DB");
	            /*
	             * This is the slower path, so we avoid it. It needs all transactions
	             * to be done in order to slowly erase the whole DB from the disk, just
	             * to reinitialize it afterward.
	             */
	            const promise = new Promise((resolve, reject) => {
	                const request = indexedDB.deleteDatabase(NAME);

	                request.onerror = reject;
	                request.onsuccess = () => resolve();
	                /* istanbul ignore next */
	                request.onblocked = () => console.log("Deleting database was blocked");
	            });

	            // Reopen the DB after it's been cleared. Don't try to fix it, if it
	            // doesn't want to open.
	            return promise.then(() => done(true)).then(() => this.openDB(NAME, true)).then(() => true);
	        }
	    }

	    /**
	     * Close the DB.
	     *
	     * @async
	     * @returns {undefined} DB is being deleted, or may already be deleted.
	     */
	    close() {
	        return new Promise(resolve => {
	            if (this.db) {
	                this.db.close();
	                this.db = null;
	                resolve();
	            } else {
	                resolve();
	            }
	        });
	    }
	}
	exports.default = ChannelList;

/***/ },
/* 39 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	  value: true
	});

	var _index = __webpack_require__(10);

	var _index2 = _interopRequireDefault(_index);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	/**
	 * Frozen.
	 *
	 * @typedef {Object} SerializedProvider
	 * @property {string} name
	 * @property {module:providers/generic-provider~ProviderSupports} supports
	 * @property {boolean} enabled
	 */

	/**
	 * Serializes the providers objects so they can get passed as a message.
	 *
	 * @param {Object.<string, module:providers/generic-provider.GenericProvider>} providers
	 *                                              - Providers object to serialize.
	 * @returns {Object<string, module:providers/serialized~SerializedProvider>}
	 *         Frozen Object of serialized providers by id.
	 */
	const serializeProviders = providers => {
	  const ret = {};
	  for (let p in providers) {
	    ret[p] = Object.freeze({
	      name: providers[p].name,
	      supports: providers[p].supports,
	      enabled: providers[p].enabled
	    });
	  }
	  Object.freeze(ret);
	  return ret;
	};

	/**
	 * @see {@link module:providers/serialized~serializeProviders}
	 * @type {Object<string, module:providers/serialized~SerializedProvider>}
	 */
	/**
	 * Serializes the providers so they can be sent over a message port.
	 * @author Martin Giger
	 * @license MPL-2.0
	 * @module providers/serialized
	 * @see {@link module:providers}
	 */
	exports.default = serializeProviders(_index2.default);

/***/ },
/* 40 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.load = exports.copy = exports.create = exports.PREFS_MAPPING = undefined;

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _core = __webpack_require__(13);

	var _utils = __webpack_require__(4);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Creates a dump of the whole channel list and other relevant settings and
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * can copy it to the clipboard.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module channel/dump
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */


	const PREFS_MAPPING = exports.PREFS_MAPPING = Object.freeze({
	    queue: Object.freeze({
	        interval: "updateInterval",
	        ratio: "queue_ratio",
	        maxAmount: "queue_maxRequestBatchSize",
	        maxRetries: "queueservice_maxRetries"
	    }),
	    panel: Object.freeze({
	        style: "panel_style",
	        extras: "panel_extras",
	        width: "panel_minWidth",
	        height: "panel_maxHeight",
	        badge: "panel_badge"
	    }),
	    misc: Object.freeze({
	        cacheTime: "channellist_cacheTime",
	        findMature: "find_mature"
	    })
	});

	/**
	 * Frozen
	 *
	 * @typedef {Object} DataDump
	 * @property {Array.<Object>} channels - Serialized channels
	 * @property {Array.<Object>} users - Serialized users
	 * @property {Object} prefs - Collection of important preferences
	 * @property {Object} meta - System information
	 */

	/**
	 * Creates a JSON serialized dump of all importand extension data.
	 *
	 * @param {Array.<module:channel/core.Channel>} channels - Channels to dump.
	 * @param {Array.<module:channel/core.User>} users - Users to dump.
	 * @returns {module:channel/dump~DataDump} Serialized data dump.
	 * @async
	 */
	const create = exports.create = (() => {
	    var _ref = _asyncToGenerator(function* (channels, users) {
	        const p = {};
	        const promises = [];
	        for (let branch in PREFS_MAPPING) {
	            p[branch] = {};
	            for (let name in PREFS_MAPPING[branch]) {
	                promises.push(_preferences2.default.get(PREFS_MAPPING[branch][name]).then(function (value) {
	                    p[branch][name] = value;
	                }));
	            }
	        }

	        yield Promsie.all(promises);

	        for (let branch in p) {
	            Object.freeze(p[branch]);
	        }

	        const platform = yield browser.runtime.getPlatformInfo();
	        const manifest = browser.runtime.getManifest();

	        const debugDump = {
	            channels: channels.map(function (c) {
	                return c.serialize();
	            }),
	            users: users.map(function (u) {
	                return u.serialize();
	            }),
	            prefs: Object.freeze(p),
	            meta: Object.freeze({
	                version: manifest.version,
	                platform: platform.os,
	                platformArch: platform.arch
	            })
	        };
	        Object.freeze(debugDump);

	        return debugDump;
	    });

	    return function create(_x, _x2) {
	        return _ref.apply(this, arguments);
	    };
	})();

	/**
	 * Creates and copies the data dump to the clipboard.
	 *
	 * @param {Array.<module:channel/core.Channel>} channels - Channels to dump.
	 * @param {Array.<module:channel/core.User>} users - Users to dump.
	 */
	const copy = exports.copy = (() => {
	    var _ref2 = _asyncToGenerator(function* (channels, users) {
	        const data = yield exports.create(channels, users),
	              p = (0, _utils.when)(document, "copy");
	        document.execCommand("copy", false, null);
	        const e = yield p;

	        e.clipboardData.setData("application/json", JSON.stringify(data, null, 2));
	        e.preventDefault();
	        console.log("Data dump copied to clipboard");
	    });

	    return function copy(_x3, _x4) {
	        return _ref2.apply(this, arguments);
	    };
	})();

	/**
	 * @typedef {Object} ChannelsAndUsers
	 * @property {Array.<module:channel/core.Channel>} channels
	 * @property {Array.<module:channel/core.User>} users
	 */

	/**
	 * Loads a data dump's data into the extension. Applies dumped settings
	 * directly.
	 *
	 * @param {module:channel/dump~DataDump} debugDump - Dump to decode.
	 * @returns {module:channel/dump~ChannelsAndUsers} Deserialized channels and
	 *          users.
	 * @async
	 */
	const load = exports.load = debugDump => {
	    const promises = [];
	    for (let branch in debugDump.prefs) {
	        for (let name in debugDump.prefs[branch]) {
	            promises.push(_preferences2.default.set(PREFS_MAPPING[branch][name], debugDump.prefs[branch][name]));
	        }
	    }

	    return {
	        channels: debugDump.channels.map(c => _core.Channel.deserialize(c)),
	        users: debugDump.users.map(u => _core.User.deserialize(u))
	    };
	};

/***/ },
/* 41 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports.search = undefined;

	var _sdk = __webpack_require__(3);

	var _sdk2 = _interopRequireDefault(_sdk);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	const search = exports.search = ({ url }) => {
	    return _sdk2.default.doAction({
	        target: "passwords-search",
	        url
	    });
	}; /**
	    * Credentials search wrapper.
	    *
	    * @author Martin Giger
	    * @license MPL-2.0
	    */

/***/ },
/* 42 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});

	var _utils = __webpack_require__(4);

	var _preferences = __webpack_require__(2);

	var _preferences2 = _interopRequireDefault(_preferences);

	var _liveState = __webpack_require__(5);

	var _liveState2 = _interopRequireDefault(_liveState);

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

	function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; } /**
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * Model for the Panel.
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            *
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @author Martin Giger
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @license MPL-2.0
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @module list
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @requires module:channel/utils
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @requires module:list/firefox
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            * @todo coutner badge vs. live state handling change
	                                                                                                                                                                                                                                                                                                                                                                                                                                                                            */
	// setup event handling


	/**
	 * Should open the ChannelsManager.
	 *
	 * @event module:list.ListView#opencm
	 */
	/**
	 * Passes two arguments: type and login of the channel to add.
	 *
	 * @event module:list.ListView#addchannel
	 */
	/**
	 * The user triggered a manual refresh from the list. Optionally holds the ID of
	 * the channel to update, else all channels are to be updated.
	 *
	 * @event module:list.ListView#refresh
	 * @type {number?}
	 */
	/**
	 * The user wishes to open the a channel by approriate means. The second
	 * parameter specifies the means, like the "what" parameter of
	 * {@link module:channel/utils.selectOrOpenTab}.
	 *
	 * @event module:list.ListView#open
	 * @type {number}
	 */
	/**
	 * The user wishes to pause the update queue.
	 *
	 * @event module:list.ListView#pause
	 */
	/**
	 * The user wishes to resume the update queue.
	 *
	 * @event module:list.ListView#resume
	 */
	/**
	 * The list is ready for modifications.
	 *
	 * @event module:list.ListView#ready
	 */
	/**
	 * @typedef Style
	 * @type {number}
	 */
	/**
	 * @typedef {number} NonLiveDisplay
	 */

	const LIVE_ICONS = {
	    "16": "images/icon16.png",
	    "18": "images/icon18.png",
	    "32": "images/icon32.png",
	    "36": "images/icon36.png",
	    "48": "images/icon48.png",
	    "64": "images/icon64.png"
	},
	      OFFLINE_ICONS = {
	    "16": "images/offline16.png",
	    "18": "images/offline18.png",
	    "32": "images/offline32.png",
	    "36": "images/offline36.png",
	    "48": "images/offline48.png",
	    "64": "images/offline64.png"
	},
	      _ = browser.i18n.getMessage;

	/**
	 * @class module:list.ListView
	 * @extends external:EventTarget
	 */
	class ListView extends EventTarget {
	    /**
	     * @constructs
	     * @fires module:list.ListView#opencm
	     * @fires module:list.ListView#addchannel
	     * @fires module:list.ListView#ready
	     * @fires module:list.ListView#open
	     * @fires module:list.ListView#refresh
	     * @fires module:list.ListView#pause
	     * @fires module:list.ListView#resume
	     * @alias module:list.ListView
	     */

	    /**
	     * Display non-live channels in their own category.
	     * @const {module:list~NonLiveDisplay
	     * @default 2
	     */


	    /**
	     * Display non-live channels as live.
	     *
	     * @const {module:list~NonLiveDisplay}
	     * @default 0
	     */

	    /**
	     * @const {module:list~Style}
	     * @default 1
	     */
	    constructor() {
	        super();
	        this.ready = false;
	        this.port = null;
	        this._liveState = false;
	        this.live = new Set();
	        this.nonlive = new Set();

	        browser.runtime.onConnect.addListener(port => {
	            if (port.name == "list") {
	                this._setupPort(port);
	            }
	        });

	        _preferences2.default.addEventListener("change", event => {
	            if (event.pref == "panel_badge") {
	                this.updateBadge();
	            }
	        }, { passive: false });
	    }
	    /**
	     * Display non-live channels as offline (ignore their liveness). This is handled
	     * directly in this module, so the channel gets passed as going offline.
	     * @const {module:list~NonLiveDisplay}
	     * @default 3
	     */

	    /**
	     * Display non-live channels as live but sort them to the bottom if possible.
	     * @const {module:list~NonLiveDisplay}
	     * @default 1
	     */

	    /**
	     * @const {module:list~Style}
	     * @default 2
	     */

	    /**
	     * @const {module:list~Style}
	     * @default 0
	     */


	    _setupPort(port) {
	        this.port = port;

	        this.setStyle();
	        this.setExtrasVisibility();
	        this.setNonLiveDisplay();
	        this.setTheme();
	        //TODO closing panel?
	        this.port.onMessage.addListener(event => {
	            if (event.target == "offline") {
	                //TODO
	                this.liveState = false;
	            } else if (event.target == "openUrl") {
	                (0, _utils.emit)(this, "open", event.channelId);
	            } else if (event.target == "openChat") {
	                (0, _utils.emit)(this, "open", event.channelId, "chat");
	            } else if (event.target == "openArchive") {
	                (0, _utils.emit)(this, "open", event.channelId, "archive");
	            } else if (event.target == "refresh") {
	                (0, _utils.emit)(this, "refresh", event.channelId);
	            } else if (event.target == "configure") {
	                (0, _utils.emit)(this, "opencm");
	            } else if (event.target == "add") {
	                (0, _utils.emit)(this, "addchannel", event.type, event.login);
	            } else if (event.target == "pause") {
	                (0, _utils.emit)(thise, "pause");
	            } else if (event.target == "resume") {
	                (0, _utils.emit)(this, "resume");
	            } else if (event.target == "ready") {
	                this.ready = true;
	                (0, _utils.emit)(this, "ready");
	            } else if (event.target == "search") {
	                providers[event.type].search(event.query).then(channels => this.setFeatured(channels.map(c => c.serialize()), event.type, event.query), () => this.setFeatured([], event.type, event.query));
	            } else if (event.target == "explore") {
	                providers[event.type].getFeaturedChannels().then(channels => this.setFeatured(channels.map(c => c.serialize()), event.type), () => this.setFeatured([], event.type));
	            } else if (event.target == "copy") {
	                (0, _utils.emit)(this, "copy", event.channelId);
	            } else if (event.target == "copyexternal") {
	                (0, _utils.emit)(this, "copy", event.login, event.type);
	            } else if (event.target == "removedLive") {
	                this._unregisterChannel(event.channelId);
	            }
	        });
	    }

	    _emitToList(event, data) {
	        if (this.port) {
	            this.port.postMessage({
	                target: event,
	                data
	            });
	        }
	    }

	    get countNonlive() {
	        return this.nonLiveDisplay < ListView.DISTINCT;
	    }

	    updateBadge() {
	        var _this = this;

	        return _asyncToGenerator(function* () {
	            const size = _this.live.size + (_this.countNonlive ? _this.nonlive.size : 0);
	            if (size > 0) {
	                if (yield _preferences2.default.get("panel_badge")) {
	                    browser.browserAction.setBadgeText({
	                        text: size
	                    });
	                } else {
	                    browser.browserAction.setBadgeText({
	                        text: null
	                    });
	                }

	                browser.browserAction.setIcon({
	                    imageData: LIVE_ICONS
	                });
	                browser.browserAction.setTitle({
	                    title: _("listTooltipLive")
	                });
	            } else {
	                browser.browserAction.setBadgeText({
	                    text: null
	                });
	                browser.browserAction.setIcon({
	                    imageData: OFFLINE_ICONS
	                });
	                browser.browserAction.setTitle({
	                    title: _("listTooltipOffline")
	                });
	            }
	        })();
	    }

	    _updateChannel(channel) {
	        if (channel.live.state == _liveState2.default.OFFLINE) {
	            this._unregisterChannel(channel.id);
	        } else {
	            this._registerChannel(channel);
	        }
	        this.updateBadge();
	    }

	    _registerChannel(channel) {
	        if (channel.live.state == _liveState2.default.LIVE) {
	            if (this.nonlive.has(channel.id)) {
	                this.nonlive.delete(channel.id);
	            }
	            this.live.add(channel.id);
	        } else {
	            if (this.live.has(channel.id)) {
	                this.live.delete(channel.id);
	            }
	            this.nonlive.add(channel.id);
	        }
	    }

	    _unregisterChannel(channelId) {
	        if (this.live.has(channelId)) {
	            this.live.delete(channelId);
	        } else if (this.nonlive.has(channelId)) {
	            this.nonlive.delete(channelId);
	        }

	        if (this.live.size === 0 && (!this.countNonlive || this.nonlive.size === 0)) {
	            this.liveState = false;
	        }
	    }

	    /**
	     * Indicates the live state over all channels.
	     *
	     * @memberof module:list.ListView
	     * @type {boolean}
	     */
	    get liveState() {
	        return this._liveState;
	    }
	    set liveState(val) {
	        this._liveState = val;
	        if (!val) {
	            this.live.clear();
	            this.updateBadge();
	        }
	    }

	    /**
	     * Set the style of the list.
	     *
	     * @param {module:list~Style} style - Style to set.
	     */
	    setStyle(style = this._style) {
	        this._style = style;
	        this._emitToList("setStyle", style);
	    }

	    /**
	     * Set the visibility of the extras.
	     *
	     * @param {boolean} visible - Visibility of extras.
	     */
	    setExtrasVisibility(visible = this._extras) {
	        this._extras = visible;
	        this._emitToList("setExtras", visible);
	    }

	    /**
	     * Set the display type for non-live content.
	     *
	     * @param {module:list~NonLiveDisplay} style - Display mode of non-live content.
	     */
	    setNonLiveDisplay(style = this.nonLiveDisplay) {
	        this.nonLiveDisplay = style;
	        this.updateBadge();
	        if (this.nonlive.size > 0 && this.live.size === 0 && style < 2) {
	            this.liveState = true;
	        }

	        this._emitToList("setNonLiveDisplay", style);
	    }

	    /**
	     * Add channels to the list. Updates the live state.
	     *
	     * @param {Array.<module:channel/core.Channel>} channels - Channels to add.
	     */
	    addChannels(channels) {
	        if (channels.some(channel => channel.live.isLive())) {
	            this.liveState = true;
	        }
	        channels.forEach(this._updateChannel, this);
	        this.updateBadge();
	        this._emitToList("addChannels", channels.map(c => c.serialize()));
	    }
	    /**
	     * Remove a channel from the list. Updates the liveState if appropriate.
	     *
	     * @param {number} channelId - ID of the channel to remove.
	     */
	    removeChannel(channelId) {
	        this._unregisterChannel(channelId);
	        this._emitToList("removeChannel", channelId);
	    }
	    /**
	     * Mark a channel as live. Also updates the liveState. Can also be user to
	     * update the info of a channel.
	     *
	     * @param {module:channel/core.Channel} channel - Channel to mark live.
	     */
	    setChannelLive(channel) {
	        this._updateChannel(channel);
	        this._emitToList("setOnline", channel.serialize());
	        this.liveState = true;
	    }
	    /**
	     * Mark a channel as offline. Also updates liveState if appropriate.
	     *
	     * @param {module:channel/core.Channel} channel - Channel to mark offline.
	     */
	    setChannelOffline(channel) {
	        this._updateChannel(channel);
	        this._emitToList("setOffline", channel.serialize());
	    }

	    /**
	     * Mark a channel as in a distinct state that is not online or offline.
	     *
	     * @param {module:channel/core.Channel} channel - Channel to give a distinct
	     *                                                state to.
	     */
	    setChannelDistinct(channel) {
	        this._updateChannel(channel);
	        this._emitToList("setDistinct", channel.serialize());
	    }

	    /**
	     * Set the available providers.
	     *
	     * @param {Object.<module:providers/generic-provider.GenericProvider>} serializedProviders
	     *                                                    - Available providers.
	     */
	    setProviders(serializedProviders) {
	        this._emitToList("setProviders", serializedProviders);
	    }

	    /**
	     * Indicate if the update queue is running in the background or not.
	     *
	     * @param {boolean} enabled - If queue is enabled.
	     */
	    setQueueStatus(enabled) {
	        this._emitToList("queueStatus", enabled);
	    }

	    /**
	     * Indicate if the queue is temporarily paused.
	     *
	     * @param {boolean} paused - If queue is paused.
	     */
	    setQueuePaused(paused) {
	        this._emitToList("queuePaused", paused);
	    }

	    /**
	     * Set the theme.
	     *
	     * @param {number} theme - Theme type.
	     */
	    setTheme(theme = this._theme) {
	        this._emitToList("theme", theme);
	    }

	    /**
	     * Something with the channel changed. Performs appropriate actions based on the
	     * state of the channel. Updates liveState if appropriate.
	     *
	     * @param {module:channel/core.Channel} channel - Channel that changed.
	     */
	    onChannelChanged(channel) {
	        console.log("updating state for", channel.login);
	        if (channel.live.state > 0 && this.nonLiveDisplay === ListView.LIVE_DISTINCT) {
	            this.setChannelDistinct(channel);
	        } else if (channel.live.isLive()) {
	            this.setChannelLive(channel);
	        } else {
	            this.setChannelOffline(channel);
	        }
	    }

	    setFeatured(channels, type, q) {
	        this._emitToList("setFeatured", { channels, type, q });
	    }
	}

	ListView.STYLE_COMPACT = 0;
	ListView.STYLE_NORMAL = 1;
	ListView.STYLE_THUMBNAIL = 2;
	ListView.LIVE = 0;
	ListView.LIVE_BOTTOM = 1;
	ListView.DISTINCT = 2;
	ListView.OFFLINE = 3;
	exports.default = ListView;

/***/ }
/******/ ]);