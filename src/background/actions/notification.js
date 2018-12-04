import Rule from './rule.js';

export default class Notification extends Rule {
    //TODO also has the change condition available and would probably implement the logic for it?

    constructor(target, conditions, action) {
        super(target, conditions);
        this.action = action;
    }

    buildID(context) {
        return `${NOTIFICATION_PREFIX}:${context.id}:${this.action}`;
    }

    showNotification(context) {
        if(this.applies(context)) {
            const target = this.buildTarget(context);
            //TODO click handler determines action to run based on id.
            return browser.notifications.create(this.buildID(), {
                type: "basic",
                title: target,
                message: context.title,
                iconUrl: context.getBestImageForSize(NOTIFICATION_ICON_SIZE)
            });
        }
    }
}
