const PROPERTIES = {
        id: 'login',
        slug: 'slug',
        name: 'uname',
        url: 'url',
        archiveUrl: 'archiveUrl',
        chatUrl: 'chatUrl',
        thumbnailUrl: 'thumbnail',
        title: 'title',
        avatarUrl: 'image',
        category: 'category',
        type: 'type',
        viewers: 'viewers',
        language: 'language',
        mature: 'mature'
    };

export default class Rule {
    static get PROPERTIES() {
        return PROPERTIES;
    }

    constructor(target, conditions) {
        this.target = target;
        this.conditions = conditions;
    }

    //TODO how is this available in content?
    applies(context) {
        return this.conditions.every((condition) => condition.isTrue(context));
    }

    buildTarget(context) {
        let target = this.target;
        for(const property in PROPERTIES) {
            if(!target.includes('{')) {
                break;
            }
            if(PROPERTIES.hasOwnProperty(property)) {
                let val = context[PROPERTIES[property]];
                if(Array.isArray(val)) {
                    val = val[0];
                }
                else if(property == 'image') {
                    val = context.getBestImageForSize(300);
                }
                else if(typeof val === 'boolean') {
                    val = val ? 'true' : 'false';
                }
                target = target.replace(new RegExp(`{${property}}`, 'g'), val);
            }
        }
        return target;
    }
}
