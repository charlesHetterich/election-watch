import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";
import { Context } from "../context";
import { Payload } from "../type-helper";

export enum WatchType {
    EVENT = "event",
    QUERY = "query",
}

/**
 * Wrapper around an `observable` we would like to watch
 *
 * @property call    — The `observable` we intend to watch
 * @property type    - The type of the observable
 * @property callPth - The name of the observable given by its call path
 */
export class Watching {
    call: Function;
    type: WatchType;
    callPth: string;
    constructor(callPth: string, api: TypedApi<typeof dot>) {
        const pth_arr = callPth.split(".");
        let call: any = api; // TODO! remove any
        for (const pth of pth_arr) {
            call = call[pth];
        }

        switch (pth_arr[0]) {
            case "event":
                this.call = call.watch;
                this.type = WatchType.EVENT;
                break;
            case "query":
                this.call = call.watchValue;
                this.type = WatchType.QUERY;
                break;
            default:
                throw new Error(
                    `Invalid call path ${callPth}. Must start with "event" or "query".`
                );
        }
        this.callPth = callPth;
    }
}

/**
 * The expected structure of an app's exports
 *
 * @property description - The description of the app, given by the description field in the app
 * @property watching    - A path to an observable in the form `path.to.observable`
 * @property trigger     - Filters instances of the event we are watching. Triggers `lambda` when true is returned
 * @property lambda      - The work to do after `trigger` fires
 */
export type AppModule = {
    description: string;
    watching: string;
    trigger: (payload: Payload<any>, context: Context<any>) => boolean;
    lambda: (payload: Payload<any>, context: Context<any>) => Promise<any>;
};

/**
 * Stores lambda app configuration
 *
 * @property watching  reference to the observable we are watching
 */
export interface LambdaApp extends Omit<AppModule, "watching"> {
    watching: Watching;
}

/**
 * Wrapper around `LambdaApp` which stores additional metadata
 *
 * @property name  - The name of the app, given by the directory name
 * @property app   - The `LambdaApp` object
 * @property alive - Whether the app is alive or not
 * @property logs  - The logs of the app
 */
export class MetaApp {
    constructor(
        public name: string,
        public app: LambdaApp,
        public alive: boolean,
        public logs: string[] = []
    ) {}
}
