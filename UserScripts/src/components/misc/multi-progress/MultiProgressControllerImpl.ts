import ProgressController, {ProgressState} from "../../../util/progress-controller";
import {reactive} from "vue";

export type DoneListener = (shouldKeep: boolean) => void;

export interface Controller extends ProgressController {

    addDoneListener(listener: DoneListener): void
    requestStop(): void
}

export class ControllerImpl implements Controller {

    readonly children: ControllerImpl[] = [];
    msg: string | null = null;
    progress: number = 0;
    state: ProgressState = ProgressState.UNSTARTED;
    doneListeners: DoneListener[] = [];
    shouldStopVal: boolean = false;

    done(shouldKeep: boolean): void {
        this.doneListeners.forEach(listener => listener(shouldKeep));
    }

    fork(): ProgressController {
        const newChild = reactive(new ControllerImpl());
        this.children.push(newChild);
        return newChild;
    }

    setMessage(msg: string | null): void {
        this.msg = msg;
    }

    setProgress(prog: number): void {
        this.progress = prog;
    }

    setState(state: ProgressState): void {
        this.state = state;
    }

    shouldStop(): boolean {
        return this.shouldStopVal;
    }

    addDoneListener(listener: DoneListener) {
        this.doneListeners.push(listener);
    }

    requestStop() {
        this.shouldStopVal = true;
    }
}
