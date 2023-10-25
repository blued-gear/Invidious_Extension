import confirmPopup from "../workarounds/confirm";

export default function confirm(header: string, message: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        confirmPopup.require({
            header: header,
            message: message,
            accept: () => {
                resolve(true);
            },
            reject: () => {
                resolve(false);
            }
        });
    });
}
