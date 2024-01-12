import {LocationController, NavigationInterceptor} from "../location-controller";
import {unsafeWindow} from "../../monkey";

export default class InvidiousLocationControllerImpl implements LocationController {

    private readonly navigationInterceptors = new Set<NavigationInterceptor>();
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

    interceptNavigation(interceptor: NavigationInterceptor) {
        if(this.navigationInterceptors.size === 0)
            unsafeWindow.addEventListener('beforeunload', this.navigationListener);

        this.navigationInterceptors.add(interceptor);
    }

    removeNavigationInterceptor(interceptor: NavigationInterceptor) {
        this.navigationInterceptors.delete(interceptor);

        if(this.navigationInterceptors.size === 0)
            unsafeWindow.removeEventListener('beforeunload', this.navigationListener);
    }

    private onNavigation() {
        for (let interceptor of this.navigationInterceptors) {
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
