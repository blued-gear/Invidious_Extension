export interface Ret<T> {
    readonly timedOut: boolean;
    readonly result: T;
    actionResult: T | undefined;
}

/**
 * waits for a function to return and uses a fallback if a timeout is reached
 * @param timeout the time to wait for the function to return
 * @param action the function to wait for
 * @param fallback will be called to return the result in case a timeout occurred
 */
export default async function actionWithTimeout<T>(timeout: number, action: () => Promise<T>, fallback: () => Promise<T>): Promise<Ret<T>> {
    const retHolder: {ret: Ret<T> | null} = { ret: null };
    const timerHolder = { handle: <any | null>null, cancel: false };

    const actionPromise: Promise<Ret<T>> = (async () => {
        try {
            const result = await action();
            retHolder.ret = {
                timedOut: false,
                result: result,
                actionResult: result
            };
            return retHolder.ret;
        } finally {
            if(timerHolder.handle !== null)
                clearTimeout(timerHolder.handle);
            else
                timerHolder.cancel = true;
        }
    })();

    const fallbackPromise: Promise<Ret<T>> = new Promise((resolve, reject) => {
        if(timerHolder.cancel) {
            reject();
            return;
        }

        timerHolder.handle = setTimeout(() => {
            if(timerHolder.cancel) {
                reject();
                return;
            }

            fallback().then((result) => {
                retHolder.ret = {
                    timedOut: true,
                    result: result,
                    actionResult: undefined
                };
                resolve(retHolder.ret);
            }).catch(reject);
        }, timeout);
    });

    return Promise.race([actionPromise, fallbackPromise]);
}
