import {isInvidious, isPiped} from "./platform-detection";
import InvidiousLocationControllerImpl from "./invidious/location-controller";
import PipedLocationControllerImpl from "./piped/location-controller";

/**
 * called when the page is about to change
 * @return the url to which instead should be navigated or null to continue normally
 */
export type NavigationInterceptor = () => string | null;

export type OnBeforeNavigatedCallback = () => Promise<void>;
export type OnAfterNavigatedCallback = () => void;

export interface LocationController {

    /**
     * @return the current location (without host)
     */
    currentLocation(): string

    /**
     * navigates to the given location
     * (creating a new history entry)
     * @param url the target location
     */
    navigate(url: string): void

    /**
     * reloads the current page
     */
    reload(): void

    /**
     * The given callback will be invoked when the location is about to change.
     * If the navigation-target should be changed, the callback can return the desired location.
     * @param interceptor the callback
     */
    interceptNavigation(interceptor: NavigationInterceptor): void
    removeNavigationInterceptor(interceptor: NavigationInterceptor): void

    /**
     * adds a callback which is called before a location-change is committed<br/>
     * warning: all callbacks should be synchronous as on Invidious it can not be guaranteed that async callbacks can finish before unload
     * @param cb the callback
     */
    addBeforeNavigationCallback(cb: OnBeforeNavigatedCallback): void
    removeBeforeNavigationCallback(cb: OnBeforeNavigatedCallback): void
    /**
     * adds a callback which is called after a location-change has finished
     * @param fireImmediately if true, the callback will also be invoked by this call
     * @param cb the callback
     */
    addAfterNavigationCallback(fireImmediately: boolean, cb: OnAfterNavigatedCallback): void
    removeAfterNavigationCallback(cb: OnAfterNavigatedCallback): void
}

const instance: LocationController = (() => {
    if(isInvidious())
        return new InvidiousLocationControllerImpl();
    if(isPiped())
        return new PipedLocationControllerImpl();

    throw new Error("UserScript was started on an unsupported platform");
})();

export default instance;
