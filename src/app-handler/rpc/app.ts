import { AppModule, Context, processPayload } from "@lambdas/app-support";

export class AppRpc {
    constructor(private context: Context, private app: AppModule<any, any>) {}

    setSettings(settings: object) {
        for (const [key, value] of Object.entries(settings)) {
            (this.context.settings as any)[key] = value;
        }
        console.log("not implemented!");
    }

    pushPayload(routeIndex: number, rawPayload: any) {
        processPayload(
            rawPayload,
            this.context,
            this.app.routes[routeIndex].trigger,
            this.app.routes[routeIndex].lambda
        );
    }
}
