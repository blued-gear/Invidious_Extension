type ArgsType<T extends Function> = T extends (...args: infer A) => any ? A : never;

export const RESULT_THROTTLED = {};

/**
 * Wraps a given function so that each call is throttled by a certain amount of time.<br/>
 * While the throttle is active, a call to the wrapper will result in RESULT_THROTTLED.
 * @param callback the function to throttle
 * @param cooldown the cooldown of the function in ms
 */
export default function throttle<F extends (...args: any[]) => any>(callback: F, cooldown: number): (...args: ArgsType<F>) => (ReturnType<F> | typeof RESULT_THROTTLED) {
    // credits to https://stackoverflow.com/a/27078401
    let waiting = false;

    return function (this: any) {
        if(!waiting) {
            waiting = true;
            setTimeout(() => { waiting = false }, cooldown);

            return callback.apply(this, [...arguments]);
        } else {
            return RESULT_THROTTLED;
        }
    };
}
