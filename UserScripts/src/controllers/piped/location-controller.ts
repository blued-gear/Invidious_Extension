import {LocationController, NavigationInterceptor} from "../location-controller";
import {unsafeWindow} from "../../monkey";
import documentController from "../document-controller";
import {logException} from "../../util/utils";

// noinspection JSUnresolvedReference
export default class PipedLocationControllerImpl implements LocationController {

    private readonly navigationInterceptors = new Set<NavigationInterceptor>();
    private inInterception: boolean = false;

    constructor() {
        (async () => {
            await documentController.waitForUiReady();
            this.installNavigationInterceptor();
        })().catch((err) => logException(err, "PipedLocationControllerImpl::installNavigationInterceptor() failed"));
    }

    currentLocation(): string {
        return location.href;
    }

    navigate(url: string): void {
        this.router().push(url);
    }

    interceptNavigation(interceptor: NavigationInterceptor): void {
        this.navigationInterceptors.add(interceptor);
    }

    removeNavigationInterceptor(interceptor: NavigationInterceptor): void {
        this.navigationInterceptors.delete(interceptor);
    }

    private installNavigationInterceptor() {
        // see https://router.vuejs.org/guide/advanced/navigation-guards.html
        this.router().beforeEach((): any | boolean => {
            if(this.inInterception) {
                this.inInterception = false;
                return true;
            }

            const replacement = this.findRoutReplacement();
            if(replacement !== null) {
                this.inInterception = true;
                return {
                    path: replacement
                };
            }

            return true;
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
