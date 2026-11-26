import MSP, { type MspResponse } from "@/js/msp";

/**
 * Orion video recorder control (custom MSP2 commands implemented by orion-fc).
 *
 * The FC streams motion-JPEG clips to the SD card; the App only starts/stops
 * and lists them, so the video never has to cross the serial link.
 */
const ORION_VIDEO_START = 0x2f00;
const ORION_VIDEO_STOP = 0x2f01;
const ORION_VIDEO_STATUS = 0x2f02;
const ORION_VIDEO_LIST = 0x2f03;

export interface OrionClip {
    name: string;
    bytes: number;
}

function decodeText(response: MspResponse | undefined): string {
    const view = response?.data;
    if (!view) return "";
    let out = "";
    for (let i = 0; i < response.length; i++) {
        out += String.fromCharCode(view.getUint8(i));
    }
    return out;
}

export function useOrionVideo() {
    const startRecording = async (name = "orion_clip.mjpeg"): Promise<boolean> => {
        const payload = Array.from(name, (c) => c.charCodeAt(0));
        const response = await MSP.promise(ORION_VIDEO_START, payload);
        return response !== undefined && response.data.readU8() === 1;
    };

    const stopRecording = async (): Promise<void> => {
        await MSP.promise(ORION_VIDEO_STOP);
    };

    const getStatus = async (): Promise<{ active: boolean; frames: number; bytes: number }> => {
        const response = await MSP.promise(ORION_VIDEO_STATUS);
        if (!response) return { active: false, frames: 0, bytes: 0 };
        const active = response.data.readU8() === 1;
        const frames = response.data.readU16();
        const bytes = response.data.readU32();
        return { active, frames, bytes };
    };

    const listClips = async (): Promise<OrionClip[]> => {
        const response = await MSP.promise(ORION_VIDEO_LIST);
        const text = decodeText(response);
        return text
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .map((line) => {
                const [name, bytes] = line.split(/\s+/);
                return { name, bytes: Number.parseInt(bytes ?? "0", 10) };
            });
    };

    return { startRecording, stopRecording, getStatus, listClips };
}
