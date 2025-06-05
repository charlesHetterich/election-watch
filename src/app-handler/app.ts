import { Subscription } from "rxjs";
import { ChainId, Context, WatchLeaf } from "@lambdas/app-support";

/**
 * The set of valid root `Observables`
 */
export enum WatchType {
    EVENT = "event",
    STORAGE = "storage",
}

/**
 * A function that handles launching a `TRoute` specification,
 *
 * @returns `Subscription[]` corresponding to a `TRoute`'s `WatchLeaf[]`
 */
export type RouteHandler = (
    context: Context<ChainId>
) => [WatchLeaf, Subscription][];

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
 * @property subscriptions -
 */
export class LambdaApp {
    private subscriptions: Map<WatchLeaf, Subscription> = new Map();

    constructor(
        public name: string,
        public description: string,
        public alive: boolean,
        public chains: ChainId[],
        public handlers: RouteHandler[],
        public logs: string[] = []
    ) {}

    launch(context: Context<ChainId>) {
        this.handlers.forEach((handler) => {
            handler(context).forEach(([leaf, subscription]) => {
                this.subscriptions.set(leaf, subscription);
                subscription.add(() => {
                    this.subscriptions.delete(leaf);
                });
            });
        });
    }

    shutdown() {
        this.subscriptions.forEach((subscription) => {
            subscription.unsubscribe();
        });
        this.alive = false;
    }
}
