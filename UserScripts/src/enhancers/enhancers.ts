import {isInvidious, isPiped} from "../controllers/platform-detection";
import invidiousEnhancerInstance from "./invidious/enhancer";
import pipedEnhancerInstance from "./piped/enhancer";

export default async function runEnhancers() {
    if(isInvidious())
        await runInvidiousEnhancers();
    else if(isPiped())
        await runPipedEnhancers();
}

async function runInvidiousEnhancers() {
    await invidiousEnhancerInstance.run()
}

async function runPipedEnhancers() {
    await pipedEnhancerInstance.run();
}
