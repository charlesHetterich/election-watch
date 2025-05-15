import { ChainId, Context, WatchPath } from "@lambdas/app-support";

/**
 * The set of valid root `Observables`
 */
export enum WatchType {
    EVENT = "event",
    QUERY = "query",
}

/**
 * A function that handles a Substrate Lambdas `TRoute` specification
 */
export type RouteHandler = (context: Context<any>) => void;

/**
 * Wrapper around `LambdaApp` which stores additional metadata
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
        public watchPaths: WatchPath[],
        public chains: ChainId[],
        public handlers: RouteHandler[] | null,
        public logs: string[] = []
    ) {}
}
