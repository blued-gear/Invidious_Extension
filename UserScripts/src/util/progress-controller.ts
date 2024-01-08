/**
 * Instances of this interface are used to deliver updates about a progress to the UI.
 */
export default interface ProgressController {

    setState(state: ProgressState): void;

    /**
     * @param prog number between 0 and 1 or -1 to indicate "indeterminate"
     */
    setProgress(prog: number): void

    /**
     * @param msg the message to display or null to hide it
     */
    setMessage(msg: string | null): void

    /**
     * Notifies that the process is finished and the process-owner can proceed with post-actions.
     * The state should be set to either FINISHED, WARN or ERR before calling this function.
     * @param shouldKeep indicates if the progress-view should be kept visible
     *                  (for example if the state is ERR and an error-message was set by setMessage())
     */
    done(shouldKeep: boolean): void

    /**
     * Used by to process when it wishes to display a sub-progress
     */
    fork(): ProgressController
    
    /**
     * @return true if the process-owner wants it to stop
     */
    shouldStop(): boolean
}

export enum ProgressState {
    UNSTARTED,
    RUNNING,
    PAUSED,
    WARN,
    ERR,
    FINISHED
}
