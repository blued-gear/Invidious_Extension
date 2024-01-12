import {isInvidious} from "./platform-detection";
import InvidiousLocationControllerImpl from "./invidious/location-controller";

/**
 * called when the page is about to change
 * @return the url to which instead should be navigated or null to continue normally
 */
export type NavigationInterceptor = () => string | null;

export interface LocationController {

    currentLocation(): string

    navigate(url: string): void

    interceptNavigation(interceptor: NavigationInterceptor): void
    removeNavigationInterceptor(interceptor: NavigationInterceptor): void
}

const instance: LocationController = (() => {
    if(isInvidious())
        return new InvidiousLocationControllerImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();

export default instance;
