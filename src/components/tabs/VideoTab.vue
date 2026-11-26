<template>
    <BaseTab tab-name="video">
        <div class="content_wrapper">
            <div class="cf_column">
                <div class="tab_title" v-html="$t('tabVideo')"></div>
            </div>

            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-neutral-500/40 bg-neutral-500/10 p-3 text-sm">
                    Clips are recorded by the flight controller straight to its SD card as motion-JPEG, so the video
                    never crosses the serial link. Start, stop and browse from here.
                </div>

                <div class="flex items-center gap-3 flex-wrap">
                    <UButton :disabled="recording" color="error" @click="onStart">Start recording</UButton>
                    <UButton :disabled="!recording" variant="soft" @click="onStop">Stop</UButton>
                    <UButton variant="ghost" @click="refresh">Refresh clips</UButton>
                    <span class="text-sm text-neutral-400">{{ status }}</span>
                </div>

                <div v-if="recording" class="text-sm">
                    recording · {{ frames }} frames · {{ (bytes / 1024 / 1024).toFixed(2) }} MB
                </div>

                <UiBox :title="$t('tabVideo')" type="neutral">
                    <table v-if="clips.length" class="w-full text-sm">
                        <thead>
                            <tr class="text-left text-neutral-400">
                                <th>Clip</th>
                                <th>Size</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="clip in clips" :key="clip.name">
                                <td class="py-1">{{ clip.name }}</td>
                                <td>{{ (clip.bytes / 1024 / 1024).toFixed(2) }} MB</td>
                            </tr>
                        </tbody>
                    </table>
                    <p v-else class="text-sm text-neutral-400">No clips on the SD card yet.</p>
                </UiBox>
            </div>
        </div>
    </BaseTab>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from "vue";
import BaseTab from "./BaseTab.vue";
import UiBox from "@/components/elements/UiBox.vue";
import { useOrionVideo, type OrionClip } from "@/composables/useOrionVideo";

const { startRecording, stopRecording, getStatus, listClips } = useOrionVideo();

const recording = ref(false);
const frames = ref(0);
const bytes = ref(0);
const clips = ref<OrionClip[]>([]);
const status = ref("idle");

let poll: ReturnType<typeof setInterval> | null = null;

function stopPolling() {
    if (poll !== null) {
        clearInterval(poll);
        poll = null;
    }
}

async function tick() {
    try {
        const s = await getStatus();
        recording.value = s.active;
        frames.value = s.frames;
        bytes.value = s.bytes;
        status.value = s.active ? "recording" : "idle";
        if (!s.active) {
            stopPolling();
            await refresh();
        }
    } catch {
        status.value = "not connected";
    }
}

async function onStart() {
    try {
        const ok = await startRecording(`orion_${Date.now()}.mjpeg`);
        recording.value = ok;
        status.value = ok ? "recording" : "start failed";
        if (ok && poll === null) poll = setInterval(tick, 1000);
    } catch {
        status.value = "start failed";
    }
}

async function onStop() {
    try {
        await stopRecording();
    } finally {
        recording.value = false;
        stopPolling();
        await refresh();
    }
}

async function refresh() {
    try {
        clips.value = await listClips();
    } catch {
        status.value = "not connected";
    }
}

void refresh();

onUnmounted(stopPolling);
</script>
