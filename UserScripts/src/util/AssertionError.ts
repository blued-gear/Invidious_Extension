export default class AssertionError extends Error {
    constructor(msg: string) {
        super("AssertionError: " + msg);
    }
}
