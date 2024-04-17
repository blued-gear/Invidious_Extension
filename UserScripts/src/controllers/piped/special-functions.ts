// noinspection JSUnresolvedReference

import {unsafeWindow} from "../../monkey";

export function currentComponent(): any | null {
    const appElm = document.getElementById('app')!!;
    const vnode = (appElm as any)._vnode;
    const component = vnode.component?.subTree.children?.[0]?.children?.[1]?.component?.subTree.children?.[0]?.component?.subTree.children?.[1]?.component?.subTree.children?.[0]?.children?.[2]?.ctx;

    // ensure that this component is part of a route
    if(component == undefined)
        return null;
    const cKey = component.vnode.key;
    if(cKey == null || !((cKey instanceof String) || typeof cKey === 'string') || !cKey.startsWith('/'))
        return null;

    return component;
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
            return func.apply(activeComponent.ctx);
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
            return func.apply(activeComponent.ctx);
        }
    }

    throw new Error("pipedApiHost() unable to find method for extracting host");
}
