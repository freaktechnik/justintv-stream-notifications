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
    },
    FIRST = 0,
    BIGGEST_IMAGE = 300;

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
        let { target } = this;
        for(const property in PROPERTIES) {
            if(!target.includes('{')) {
                break;
            }
            if(PROPERTIES.hasOwnProperty(property)) {
                let val = context[PROPERTIES[property]];
                if(Array.isArray(val)) {
                    val = val[FIRST];
                }
                else if(property == 'image') {
                    val = context.getBestImageForSize(BIGGEST_IMAGE);
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
