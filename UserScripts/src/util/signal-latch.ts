/**
 * SignalLatch is like a Promise which can be resolved via an instance-function.
 */
export default class SignalLatch {

    private promise: Promise<void>;
    private resolve: (() => void) | null = null;
    private resolved = false;

    constructor() {
        this.promise = this.setupPromise();
    }

    async waitFor() {
        await this.promise;
    }

    signal() {
        this.resolved = true;
        this.resolve?.();
    }

    reset() {
        if(!this.resolved)
            return;

        this.resolved = false;
        this.promise = this.setupPromise();
    }

    private setupPromise(): Promise<void> {
        return new Promise(resolve => {
            this.resolve = resolve;

            if(this.resolved)
                resolve();
        });
    }
}
