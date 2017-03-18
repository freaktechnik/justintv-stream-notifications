import sinon from 'sinon';

export const promiseSpy = (cbk) => {
    const ret = sinon.spy((...args) => {
        ret.resolve(args);
        if(cbk) {
            return cbk(...args);
        }
    });
    ret.setupPromise = () => {
        ret.promise = new Promise((resolve, reject) => {
            ret.resolve = resolve;
            ret.reject = reject;
        });
    };
    ret.setupPromise();
    return ret;
};
