/**
 * SignalLatch is like a Promise which can be resolved via an instance-function.
 */
export default class SignalLatch {

    private readonly promise: Promise<void>;
    private resolve: (() => void) | null = null;
    private resolved = false;

    constructor() {
        this.promise = new Promise(resolve => {
            this.resolve = resolve;

            if(this.resolved)
                resolve();
        });
    }

    async waitFor() {
        await this.promise;
    }

    signal() {
        this.resolved = true;
        this.resolve?.();
    }
}
