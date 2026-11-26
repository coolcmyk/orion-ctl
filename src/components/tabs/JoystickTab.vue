<template>
    <BaseTab tab-name="joystick">
        <div class="content_wrapper">
            <div class="cf_column">
                <div class="tab_title" v-html="$t('tabJoystick')"></div>
            </div>

            <div class="flex flex-col gap-4">
                <div class="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm">
                    Manual control injects sticks with <code>MSP_SET_RAW_RC</code>. The flight controller still enforces
                    its own arming checks. Keep propellers off while testing.
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <!-- roll / pitch pad -->
                    <div class="flex flex-col items-center gap-2">
                        <div
                            ref="padEl"
                            class="relative w-64 h-64 rounded-full border-2 border-neutral-500 bg-neutral-900/40 touch-none select-none"
                            @pointerdown="onPointerDown"
                            @pointermove="onPointerMove"
                            @pointerup="onPointerUp"
                            @pointercancel="onPointerUp"
                        >
                            <div class="absolute left-1/2 top-0 h-full w-px bg-neutral-600"></div>
                            <div class="absolute top-1/2 left-0 h-px w-full bg-neutral-600"></div>
                            <div
                                class="absolute w-6 h-6 -ml-3 -mt-3 rounded-full bg-emerald-400 shadow"
                                :style="{ left: `${50 + roll * 45}%`, top: `${50 + pitch * 45}%` }"
                            ></div>
                        </div>
                        <div class="text-sm">
                            roll <b>{{ Math.round(1500 + roll * 500) }}</b> · pitch
                            <b>{{ Math.round(1500 - pitch * 500) }}</b>
                        </div>
                    </div>

                    <!-- throttle / yaw -->
                    <div class="flex gap-6 items-stretch">
                        <label class="flex flex-col items-center gap-2 text-sm">
                            <span>Throttle</span>
                            <input
                                v-model.number="throttle"
                                type="range"
                                min="1000"
                                max="2000"
                                class="h-56"
                                orient="vertical"
                            />
                            <b>{{ throttle }}</b>
                        </label>
                        <label class="flex flex-col items-center gap-2 text-sm">
                            <span>Yaw</span>
                            <input
                                v-model.number="yaw"
                                type="range"
                                min="1000"
                                max="2000"
                                class="h-56"
                                orient="vertical"
                            />
                            <b>{{ yaw }}</b>
                        </label>
                    </div>
                </div>

                <div class="flex items-center gap-4 flex-wrap">
                    <UCheckbox v-model="enabled" label="Stream sticks to the flight controller" />
                    <UButton color="error" variant="soft" @click="centerAll">Centre + idle</UButton>
                    <span class="text-sm text-neutral-400">{{ status }}</span>
                </div>
            </div>
        </div>
    </BaseTab>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch } from "vue";
import BaseTab from "./BaseTab.vue";
import { useMspSticks } from "@/composables/useMspSticks";
import { useConnectionStore } from "@/stores/connection";

const padEl = ref<HTMLElement | null>(null);
const roll = ref(0);
const pitch = ref(0);
const throttle = ref(1000);
const yaw = ref(1500);
const enabled = ref(false);
const status = ref("idle");

const connectionStore = useConnectionStore();
const { sendSticks } = useMspSticks();

let dragging = false;
let timer: ReturnType<typeof setInterval> | null = null;

function onPointerDown(event: PointerEvent) {
    dragging = true;
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    onPointerMove(event);
}

function onPointerMove(event: PointerEvent) {
    if (!dragging || !padEl.value) return;
    const rect = padEl.value.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    roll.value = Math.max(-1, Math.min(1, x * 2));
    pitch.value = Math.max(-1, Math.min(1, y * 2));
}

function onPointerUp() {
    dragging = false;
    // spring back to centre, like a real gimbal
    roll.value = 0;
    pitch.value = 0;
}

function frame() {
    const channels = [
        Math.round(1500 + roll.value * 500),
        Math.round(1500 - pitch.value * 500),
        throttle.value,
        yaw.value,
        1500,
        1000,
        1000,
        1000,
    ];
    sendSticks(channels);
}

function start() {
    if (timer !== null) return;
    timer = setInterval(frame, 50);
    status.value = connectionStore.connectedTo ? "streaming at 20 Hz" : "not connected";
}

function stop() {
    if (timer !== null) {
        clearInterval(timer);
        timer = null;
    }
    status.value = "idle";
}

function centerAll() {
    roll.value = 0;
    pitch.value = 0;
    throttle.value = 1000;
    yaw.value = 1500;
    frame();
}

watch(enabled, (on) => (on ? start() : stop()));

onUnmounted(() => {
    stop();
});
</script>
