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
    private navigationListenerInstalled: boolean = false;
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
        this.navigationInterceptors.add(interceptor);
        this.updateNavigationListenerInstallation();
    }

    removeNavigationInterceptor(interceptor: NavigationInterceptor) {
        this.navigationInterceptors.delete(interceptor);
        this.updateNavigationListenerInstallation();
    }

    addBeforeNavigationCallback(cb: OnBeforeNavigatedCallback) {
        this.beforeNavigateCBs.add(cb);
        this.updateNavigationListenerInstallation();
    }

    removeBeforeNavigationCallback(cb: OnBeforeNavigatedCallback) {
        this.beforeNavigateCBs.delete(cb);
        this.updateNavigationListenerInstallation();
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

    private updateNavigationListenerInstallation() {
        if(this.navigationListenerInstalled && this.navigationInterceptors.size === 0 && this.beforeNavigateCBs.size === 0) {
            unsafeWindow.removeEventListener('beforeunload', this.navigationListener);
            this.navigationListenerInstalled = false;
        } else if(!this.navigationListenerInstalled) {
            unsafeWindow.addEventListener('beforeunload', this.navigationListener);
            // why this specific event: https://developer.chrome.com/static/docs/web-platform/page-lifecycle-api/image/page-lifecycle-api-state.svg
            this.navigationListenerInstalled = true;
        }
    }
}
