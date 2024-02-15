import {
    LocationController,
    NavigationInterceptor,
    OnAfterNavigatedCallback,
    OnBeforeNavigatedCallback
} from "../location-controller";
import {unsafeWindow} from "../../monkey";
import {logException} from "../../util/utils";

export default class InvidiousLocationControllerImpl implements LocationController {

    private readonly navigationInterceptors = new Set<NavigationInterceptor>();
    private readonly beforeNavigateCBs = new Set<OnBeforeNavigatedCallback>();
    private readonly navigationListener: () => void;
    private navigationChangedCount: number = 0;

    constructor() {
        this.navigationListener = () => this.onNavigation();
    }

    currentLocation(): string {
        return location.href;
    }

    navigate(url: string) {
        location.assign(url);
    }

    reload() {
        location.reload();
    }

    interceptNavigation(interceptor: NavigationInterceptor) {
        if(this.navigationInterceptors.size === 0)
            unsafeWindow.addEventListener('beforeunload', this.navigationListener);
            // why this specific event: https://developer.chrome.com/static/docs/web-platform/page-lifecycle-api/image/page-lifecycle-api-state.svg

        this.navigationInterceptors.add(interceptor);
    }

    removeNavigationInterceptor(interceptor: NavigationInterceptor) {
        this.navigationInterceptors.delete(interceptor);

        if(this.navigationInterceptors.size === 0)
            unsafeWindow.removeEventListener('beforeunload', this.navigationListener);
    }

    addBeforeNavigationCallback(cb: OnBeforeNavigatedCallback) {
        this.beforeNavigateCBs.add(cb);
    }

    removeBeforeNavigationCallback(cb: OnBeforeNavigatedCallback) {
        this.beforeNavigateCBs.delete(cb);
    }

    addAfterNavigationCallback(fireImmediately: boolean, cb: OnAfterNavigatedCallback) {
        if(!fireImmediately)
            console.warn("InvidiousLocationControllerImpl::addAfterNavigationCallback(): callbacks without fireImmediately will never be invoked");

        if(fireImmediately)
            cb();
    }

    removeAfterNavigationCallback(cb: OnAfterNavigatedCallback) {}

    private onNavigation() {
        for (const cb of this.beforeNavigateCBs) {
            cb().catch((e) => {
                logException(e as Error, "InvidiousLocationControllerImpl::beforeNavigateCBs: a callback threw an exception");
            });
        }

        for(let interceptor of this.navigationInterceptors) {
            const newTarget = interceptor();
            if(newTarget !== null) {
                if(this.navigationChangedCount++ >= 5)
                    return;

                this.navigate(newTarget);
                setTimeout(() => { this.navigate(newTarget) }, 0);
                break;
            }
        }
    }
}
