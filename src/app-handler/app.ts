import { TypedApi } from "polkadot-api";
import { dot } from "@polkadot-api/descriptors";
import { Context, TRoute } from "@lambdas/app-support";

export enum WatchType {
    EVENT = "event",
    QUERY = "query",
}
type RouteHandler = (context: Context<any>) => void;

/**
 * Creates a route handler from a route and an API
 */
export function handlerFromRoute(
    route: TRoute<any>,
    api: TypedApi<typeof dot>
): RouteHandler {
    // Find raw watchable value
    const pth_arr = route.watching.split(".");
    let watchable: any = api; // TODO! remove any
    for (const pth of pth_arr) {
        watchable = watchable[pth];
    }

    // Configure route handler
    switch (pth_arr[0]) {
        case WatchType.EVENT:
            return (context) => {
                watchable.watch().forEach(async (data) => {
                    if (await route.trigger(data.payload, context)) {
                        route.lambda(data.payload, context);
                    }
                });
            };
        case WatchType.QUERY:
            return (context) => {
                watchable.watchValue().forEach(async (payload) => {
                    if (await route.trigger(payload, context)) {
                        route.lambda(payload, context);
                    }
                });
            };
        default:
            throw new Error(
                `Invalid call path ${route.watching}. Must start with "event" or "query".`
            );
    }
}

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
        public watchPaths: string[],
        public handlers: RouteHandler[] | null,
        public logs: string[] = []
    ) {}
}
