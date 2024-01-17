import {isInvidious} from "../controllers/platform-detection";
import invidiousEnhancerInstance from "./invidious/enhancer";

export default async function runEnhancers() {
    if(isInvidious())
        await runInvidiousEnhancers();
}

async function runInvidiousEnhancers() {
    await invidiousEnhancerInstance.run()
}
