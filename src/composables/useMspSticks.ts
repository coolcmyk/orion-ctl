import { mspHelper } from "@/js/msp/MSPHelper";

/**
 * Sends stick channels to the flight controller with MSP_SET_RAW_RC.
 *
 * Components are not allowed to import the MSP layer directly (boundary rule),
 * so the joystick tab goes through this composable.
 */
export function useMspSticks() {
    const sendSticks = (channels: number[]) => mspHelper.setRawRx(channels);

    return { sendSticks };
}
