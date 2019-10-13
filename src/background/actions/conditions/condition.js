export default class Condition {
    static get options() {
        return [ 'any' ];
    }

    static get defaultValue() {
        return 'any';
    }

    constructor(params) {
        this.params = params;
    }

    checkParam(context, param) { // eslint-disable-line no-unused-vars
        throw new Error("Not implemented");
    }

    isTrue(context) {
        return this.params.some((p) => this.checkParam(context, p));
    }
}
