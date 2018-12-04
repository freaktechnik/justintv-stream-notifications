export default class Condition {
    static get options() {
        return [
            'any'
        ];
    }

    static get defaultValue() {
        return 'any';
    }

    constructor(param) {
        this.params = params;
    }

    checkParam(context, param) {
        throw new Error("Not implemented");
    }

    isTrue(context) {
        return this.params.some((p) => this.checkParam(context, p));
    }
}
