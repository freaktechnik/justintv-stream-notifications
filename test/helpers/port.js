import sinon from 'sinon';
import ChromeEvent from 'sinon-chrome/events';


export default () => ({
    onMessage: new ChromeEvent(),
    onDisconnect: new ChromeEvent(),
    postMessage: sinon.stub()
});
