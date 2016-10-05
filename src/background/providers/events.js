/**
 * Re-emits events from all providers.
 *
 * @author Martin Giger
 * @license MPL-2.0
 */
import providers from './index';
import { pipe } from '../../utils';
import EventTarget from '../../event-target';

const USER_EVENTS = [
    "updateduser",
    "newchannels"
];
const BASE_EVENTS = [
    "updatedchannels"
];

class EventSink extends EventTarget {
    constructor() {
        super();

        for(let p in providers) {
            const provider = providers[p];
            for(let e of BASE_EVENTS) {
                pipe(provider, e, this);
            }

            if(provider.supports.favorites) {
                for(let e of USER_EVENTS) {
                    pipe(provider, e, this);
                }
            }
        }
    }
}

export default EventSink;
