import {
    LocationController,
    NavigationInterceptor,
    OnAfterNavigatedCallback,
    OnBeforeNavigatedCallback
} from "../location-controller";
import {unsafeWindow} from "../../monkey";
import documentController from "../document-controller";
import {logException, sleep} from "../../util/utils";

// noinspection JSUnresolvedReference
export default class PipedLocationControllerImpl implements LocationController {

    private readonly navigationInterceptors = new Set<NavigationInterceptor>();
    private readonly beforeNavigateCBs = new Set<OnBeforeNavigatedCallback>();
    private readonly afterNavigateCBs = new Set<OnAfterNavigatedCallback>();
    private inInterception: boolean = false;

    constructor() {
        (async () => {
            await documentController.waitForUiReady();
            this.installNavigationInterceptor();
            this.installLocationChangedHandler();
        })().catch((err) => logException(err, "PipedLocationControllerImpl::installNavigationInterceptor() failed"));
    }

    currentLocation(): string {
        return location.href;
    }

    navigate(url: string): void {
        this.router().push(url);
    }

    reload() {
        location.reload();
    }

    interceptNavigation(interceptor: NavigationInterceptor): void {
        this.navigationInterceptors.add(interceptor);
    }

    removeNavigationInterceptor(interceptor: NavigationInterceptor): void {
        this.navigationInterceptors.delete(interceptor);
    }

    addBeforeNavigationCallback(cb: OnBeforeNavigatedCallback) {
        this.beforeNavigateCBs.add(cb);
    }

    removeBeforeNavigationCallback(cb: OnBeforeNavigatedCallback) {
        this.beforeNavigateCBs.delete(cb);
    }

    addAfterNavigationCallback(fireImmediately: boolean, cb: OnAfterNavigatedCallback) {
        this.afterNavigateCBs.add(cb);

        if(fireImmediately)
            cb();
    }

    removeAfterNavigationCallback(cb: OnAfterNavigatedCallback) {
        this.afterNavigateCBs.add(cb);
    }

    private installNavigationInterceptor() {
        const runBeforeNavigateCBs = async () => {
            for (const cb of this.beforeNavigateCBs) {
                try {
                    await cb();
                } catch(e) {
                    logException(e as Error, "PipedLocationControllerImpl::beforeNavigateCBs: a callback threw an exception");
                }
            }
        };

        // see https://router.vuejs.org/guide/advanced/navigation-guards.html
        this.router().beforeEach(async (): Promise<any | boolean> => {
            if(this.inInterception) {
                this.inInterception = false;
                await runBeforeNavigateCBs();
                return true;
            }

            const replacement = this.findRoutReplacement();
            if(replacement !== null) {
                this.inInterception = true;
                return replacement;
            } else {
                await runBeforeNavigateCBs();
                return true;
            }
        });
    }

    private installLocationChangedHandler() {
        this.router().afterEach(() => {
            (async () => {
                // the components will not pick up the change immediately, so wait a bit
                await sleep(1000);

                this.afterNavigateCBs.forEach((cb) => {
                    try {
                        cb();
                    } catch(e) {
                        logException(e as Error, "PipedLocationControllerImpl::afterNavigateCBs: a callback threw an exception");
                    }
                });
            })();
        });
    }

    private findRoutReplacement(): string | null {
        for (let interceptor of this.navigationInterceptors) {
            const newTarget = interceptor();
            if(newTarget !== null)
                return newTarget;
        }

        return null;
    }

    private router(): any {
        return (unsafeWindow as any).app.__vue_app__.config.globalProperties.$router;
    }
}
