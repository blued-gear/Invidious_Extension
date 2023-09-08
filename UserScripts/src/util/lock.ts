/**
 * An instance of this class can be used to wait for an async task
 */
export default class Lock {

    private generation: number = 0;
    private promise: Promise<void> | null = null;
    private promiseResolve: (() => void) | null = null;

    isLocked(): boolean {
        return this.promise != null;
    }

    async wait() {
        if(!this.isLocked())
            return;

        let generation = 0;
        do {
            generation = this.generation;
            await this.promise!!;
        } while (generation !== this.generation && !this.isLocked());
    }

    lock() {
        if(this.isLocked())
            throw new Error("already locked");

        this.generation += 1;
        this.promise = new Promise<void>(resolve => {
            this.promiseResolve = resolve;
        });
    }

    unlock() {
        if(!this.isLocked())
            throw new Error("not locked");

        this.promiseResolve!!();
    }
}
