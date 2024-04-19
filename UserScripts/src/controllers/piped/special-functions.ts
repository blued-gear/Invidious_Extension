// noinspection JSUnresolvedReference

import {unsafeWindow} from "../../monkey";

export function currentComponent(): any | null {
    return (unsafeWindow as any).app._vnode.appContext.config.globalProperties.$route.matched[0]?.instances?.default;
}

/**
 * @return the host of the Piped-API (with 'https://')
 */
export function pipedApiHost(): string {
    // noinspection JSUnresolvedReference
    const mixins: any[] = (unsafeWindow as any).app.__vue_app__._context.mixins;
    for(let mixin of mixins) {
        const func: Function | undefined = mixin.methods.authApiUrl;
        if(func != undefined) {
            // noinspection JSUnresolvedReference
            const activeComponent: any = currentComponent();
            return func.apply(activeComponent);
        }
    }

    throw new Error("pipedApiHost() unable to find method for extracting host");
}

export function pipedAuthToken(): string {
    // noinspection JSUnresolvedReference
    const mixins: any[] = (unsafeWindow as any).app.__vue_app__._context.mixins;
    for(let mixin of mixins) {
        const func: Function | undefined = mixin.methods.getAuthToken;
        if(func != undefined) {
            const activeComponent: any = currentComponent();
            return func.apply(activeComponent);
        }
    }

    throw new Error("pipedApiHost() unable to find method for extracting host");
}
