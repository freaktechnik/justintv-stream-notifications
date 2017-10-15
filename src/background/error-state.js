/**
 * @author Martin Giger
 * @license MPL-2.0
 * @module error-state
 */

import EventTarget from 'event-target-shim';
import { emit } from '../utils';
import ErrorStateConsts from '../error-state.json';

const FIRST_ACTION = 0;

/**
 * @typedef {number} ErrorType
 */

class ErrorStateManager extends EventTarget {
    constructor() {
        super();
        // Clear out any errorStates from the last session, as these might be resolved.
        browser.storage.local.set({
            errorStates: []
        });
    }

    async register(message, gravity, actions, id) {
        const { errorStates } = await browser.storage.local.get(ErrorStateConsts.STORE);
        errorStates.push({
            message,
            gravity,
            actions,
            id
        });
        await browser.storage.local.set({ errorStates });
        emit(this, "register");
    }

    /**
     * @param {string} id - ID of the error state to remove.
     * @returns {boolean} If there are no more error states register.
     */
    async unregister(id) {
        let { errorStates } = await browser.storage.local.get(ErrorStateConsts.STORE);
        errorStates = errorStates.filter((e) => e.id !== id);
        await browser.storage.local.set({ errorStates });
        if(!errorStates.length) {
            emit(this, "empty");
            return true;
        }
        return false;
    }

    /**
     * Not static because the class is not public, only the instance.
     *
     * @returns {Promise.<boolean>} If there currently are any error states.
     */
    get IN_ERROR_STATE() {
        return browser.storage.local.get(ErrorStateConsts.STORE)
            .then(({ errorStates }) => !!errorStates.length);
    }
}

export const errorStateManager = new ErrorStateManager();

/**
 * Global error state of the extension.
 */
export default class ErrorState extends EventTarget {
    /**
     * Recoverable error within the extension. Resolving is possible during
     * runtime.
     *
     * @type {module:error-state~ErrorType}
     * @readonly
     * @default 1
     */
    static get RECOVERABLE() {
        return ErrorStateConsts.RECOVERABLE;
    }

    /**
     * Unrecoverable error within the extension. Resolving is impossible during
     * runtime and will require changes while the extension is not running.
     *
     * @type {module:error-state~ErrorType}
     * @readonly
     * @default 2
     */
    static get UNRECOVERABLE() {
        return ErrorStateConsts.UNRECOVERABLE;
    }

    static get NOTIFICATION_ID() {
        return "errorstate";
    }

    /**
     * @param {module:error-state~ErrorType} gravity - Gravity to get an icon for.
     * @returns {string} URL to the fitting icon.
     */
    static getIcon(gravity) {
        if(gravity === ErrorState.RECOVERABLE) {
            return "assets/images/recoverable.svg";
        }

        return "assets/images/unrecoverable.svg";
    }

    /**
     * @param {module:error-state~ErrorType} gravity - Gravity to get the title for.
     * @returns {string} Title for the gravity.
     */
    static getTitle(gravity) {
        return browser.i18n.getMessage(`errorState${gravity}`);
    }

    static async replaceIcon() {
        browser.browserAction.setBadgeText({
            text: "!"
        });
        browser.browserAction.setIcon({
            path: ErrorState.getIcon(ErrorState.currentGravity)
        });
        browser.browserAction.setTitle({
            title: ErrorState.getTitle(ErrorState.currentGravity)
        });
    }

    /**
     * @param {string} url - Document to load into the panel.
     * @returns {string} The old URL the panel had loaded.
     */
    static async replacePanel(url) {
        const oldUrl = await browser.browserAction.getPopup({});
        browser.browserAction.setPopup({
            popup: url
        });
        return oldUrl;
    }

    static async register({
        message, gravity, actions, id
    }) {
        await errorStateManager.register(message, gravity, actions, id);
        if(!ErrorState.currentGravity || ErrorState.currentGravity < gravity) {
            ErrorState.currentGravity = gravity;
            ErrorState.replaceIcon();
            ErrorState.oldPopupURL = await ErrorState.replacePanel("popup/errorState/index.html");
        }
    }

    static async unregister({
        gravity, id
    }) {
        const empty = await errorStateManager.unregister(id);
        if(empty && gravity === ErrorState.RECOVERABLE) {
            ErrorState.currentGravity = ErrorStateConsts.NONE;
            browser.browserAction.setBadgeText({
                text: ""
            });
            ErrorState.replacePanel(ErrorState.oldPopupURL);
        }
        // Don't care about any other state downgrade, since unrecoverable errors
        // shouldn't be recovered at runtime.
    }

    /**
     * @param {string} error - Description for a human of what the error is.
     * @param {module:error-state~ErrorType} gravity - How bad the error is.
     * @param {[string]} [actions=[]] - Ways to deal with the error or learn
     *                                        more about it. First action is the
     *                                        default action for notifications.
     */
    constructor(error, gravity, actions = []) {
        super();
        this.message = error;
        this.gravity = gravity;
        this.actions = actions;
        this.id = `${this.gravity}:${Date.now()}`;
        this._ready = Promise.all([
            ErrorState.register(this),
            this.addNotification()
        ]).catch((e) => console.error("Error initializing error state", e));

        if(this.actions.length) {
            this.runtimeListener = (message) => {
                if(message.command === "errorState-action" && message.id === this.id) {
                    this.triggerAction(message.action);
                }
            };
            browser.runtime.onMessage.addListener(this.runtimeListener);
            this.notificationListener = (notificationId) => {
                if(notificationId === ErrorState.NOTIFICATION_ID + this.id) {
                    this.triggerAction(FIRST_ACTION);
                }
            };
            browser.notifications.onClicked.addListener(this.notificationListener);
        }
    }

    triggerAction(actionId) {
        emit(this, "action", actionId);
    }

    /**
     * @async
     * @returns {undefined}
     */
    addNotification() {
        return browser.notifications.create(ErrorState.NOTIFICATION_ID + this.id, {
            type: "basic",
            title: ErrorState.getTitle(this.gravity),
            message: this.message,
            //buttons: this.actions.map((title) => ({ title })),
            priority: this.gravity,
            iconUrl: ErrorState.getIcon(this.gravity)
            //sticky: true
        });
    }

    /**
     * @async
     * @returns {undefined}
     */
    removeNotification() {
        return browser.notifications.clear(ErrorState.NOTIFICATION_ID + this.id);
    }

    /**
     * If the error is recoverable, this returns the extension to a normal state.
     *
     * @returns {undefined}
     * @throws When trying to resolve unresolvable error.
     * @throws When resolving failed and the notification was not removed or the
     *         popup not reset.
     */
    async resolve() {
        if(this.gravity === ErrorState.RECOVERABLE) {
            await Promise.all([
                ErrorState.unregister(this),
                this.removeNotification()
            ]);
            if(this.actions.length) {
                browser.runtime.onMessage.removeListener(this.runtimeListener);
                browser.notifications.onClicked.removeListener(this.notificationListener);
            }
        }
        else {
            throw new Error("Cannot resolve unresolvable error");
        }
    }
}
