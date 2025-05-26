import { ChainId, Context, WatchLeaf } from "@lambdas/app-support";

/**
 * The set of valid root `Observables`
 */
export enum WatchType {
    EVENT = "event",
    QUERY = "query",
}

/**
 * A function that launches & handles a `TRoute` specification
 */
export type RouteHandler = (context: Context<any>) => void;

/**
 * The object that is derived from loading an `AppModule` specification
 *
 * Contains all relevant information & live metrics for a single app running
 * in our Substrate Lambdas instance.
 *
 * @property name        - The name of the app
 * @property description - A description of the app
 * @property alive       - Whether the app is alive or not
 * @property watchPaths  - The paths that the app is watching
 * @property handlers    - The handlers for the app
 * @property logs        - The logs for the app
 */
export class LambdaApp {
    constructor(
        public name: string,
        public description: string,
        public alive: boolean,
        public watchPaths: WatchLeaf[],
        public chains: ChainId[],
        public handlers: RouteHandler[],
        public logs: string[] = []
    ) {}
}
