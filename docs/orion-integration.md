# Orion integration plan (fork: coolcmyk/orion-ctl)

This fork of the Betaflight App carries the Orion features. Upstream already
provides more than expected, so each feature is mapped to a real hook.

## Build (pnpm)

```bash
pnpm install
pnpm build      # or: pnpm dev
```

`.npmrc` sets `shamefully-hoist=true`: the project was developed against npm's
flat `node_modules`, and pnpm's strict layout otherwise surfaces phantom
dependencies one build at a time (`@vue/compiler-sfc`, `workbox-window`,
`@vueuse/core`).

Node note: `package.json` wants `node ^24.21.0`; it builds on 24.13.1 but prints
an engine warning.

## Feature 1 - waypoints (already in the App)

`src/components/tabs/FlightPlanTab.vue` + `src/composables/useFlightPlan.ts`
give a map, waypoint list and elevation profile. The upload path is **CLI**, not
MSP:

```
MSP.send_cli_command("waypoint insert ...")
```

So the FC must implement **MSP_CLI (command 217)** and the `waypoint` command
family. The current orion-fc port answers `$M!` (unsupported). That is the first
FC-side task.

## Feature 2 - manual control via joystick (new)

The App is a configurator: no stick input exists upstream. Needs

1. a new tab with a virtual joystick (touch + pointer),
2. an FC command that injects RC channels. Betaflight's `MSP_SET_RAW_RC`
   (command 200) is the natural choice; orion-fc does not implement it yet,
3. a receiver type on the FC that accepts those channels (FEATURE_RX_MSP).

Safety: this must not bypass arming - the same arming checks as a real receiver.

## Feature 3 - video recording to SD (new)

Needs a new tab (start/stop, list clips) plus FC-side capture:

1. ESP32-P4 MIPI-CSI (OV5647) via `esp_video` with the JPEG encoder,
2. write frames to the SD card (SDMMC slot 0),
3. a command set (start/stop/status/list) over MSP2 custom commands.

The camera bring-up is currently blocked in the Arduino core
(`dw-gdma ... user context not in internal RAM`); the ESP-IDF path is the one
that works, which is why the FC port uses ESP-IDF already.

## Transport

All three work over the USB serial link the App already uses (WebSerial in the
browser). Phone use requires the native Android app or a USB OTG cable; the P4
does not provide WiFi, so there is no wireless transport in this fork.
