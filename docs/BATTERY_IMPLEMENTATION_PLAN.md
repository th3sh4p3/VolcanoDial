# Battery startup, quiet idle and shutdown implementation plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task. Steps use checkboxes. The user authorized implementation and installation on 4 November 2026. See BATTERY_FIRMWARE_0.2.17.md and BATTERY_HARDWARE_ACCEPTANCE.md for software results and remaining physical acceptance.

**Goal:** Reliable battery cold-start and intentional wake, quiet idle, safe manual/automatic cutoff, and truthful power UI, with an optional plug-in fuel gauge.

**Architecture:** Retain the existing worker-owned safety/Hue shutdown gate. Separate user inactivity and wake intent from render changes. Isolate board power handling and optional telemetry from the UI and workflow engine.

**Tech Stack:** ESP32-S3 Arduino, M5Dial 1.0.3, M5Unified 0.2.25, M5GFX 0.2.32, existing Node/native C++ harness; optional PCA9548AP and MAX17048 over external I2C.

**Spec:** [Battery power design](BATTERY_POWER_PLAN.md), [hardware research](../hardware/BATTERY_RESEARCH_2026-11-03.md).

## Global constraints

- Historical planning baseline: documented installed 0.2.14/source 0.2.16. Direct USB on 4 November confirmed actual pre-update firmware 0.2.16.
- Subsequent implementation and app-only USB installation are authorized; preserve library, NVS and filesystem.
- Keep the existing EREMIT battery, Dial, Chain Key, USB-C data/charging connector and stored user data.
- No new soldering, crimping, wire cutting, repinning, board jumper cutting, or loose-wire construction in the user's assembly.
- No automatic program/HEAT/AIR ON on boot, wake, reconnect, timer, or fault recovery. OFF-only safety recovery remains permitted.
- Preserve existing cooling/HEAT/AIR/queue/held-demand safety guards and Hue OFF confirmation before cutoff.
- Unsupported or stale battery and charger measurements remain unknown.

## Review focus

- Short/held boot press is consumed until release; its release must not start a workflow.
- Radio/temperature/key-presence churn cannot reset inactivity or wake the screen repeatedly.
- USB keeps the CPU running after latch release; never falsely claim physical cutoff or re-latch automatically.
- A pending cooling/OFF obligation survives a reset and cannot be removed to save battery.
- A fuel gauge may be absent, stale, or permanently powered while the Dial is off; avoid false UI and back-power/wake paths.

## Task 1: Establish the actual startup fault

**Files:** create `docs/BATTERY_HARDWARE_ACCEPTANCE.md` during implementation; inspect `VolcanoDial.ino::setup`, installed library/build provenance, and hardware wake circuit.

**Interfaces:** a private observation record with supply combination, physical actuator, reset cause, board ID, HOLD level and measured battery/rail minima. Public evidence contains no credentials.

- [ ] Reconcile installed build/version and dependency provenance with the 0.2.14 record. Read-only USB `info` if accessible; filter its PIN/AP password from output. Do not use esptool chip detection just to query the version because it can reset the device.
- [ ] Reproduce cold battery insertion followed by the actual physical WAKE actuator, both short press and hold through boot; distinguish no rail startup from rail startup followed by reset/collapse. Compare USB boot then unplug.
- [ ] Measure cell voltage at rest and during startup and verify existing adapter contact/polarity against the schematic. A skilled bench measurement is a diagnostic requirement, not additional user cable construction.
- [ ] Check whether RTC alarm/timer flags/IRQ remain asserted and whether the held button or MCU HOLD takes over the power latch. Pinned M5Unified already defaults to disabling RTC IRQs during startup: capture evidence before its cleanup where feasible, otherwise identify it as post-cleanup readback. Check with Chain Key attached and detached.
- [ ] Select the smallest change supported by this evidence. If the supply never rises on the correct physical WAKE press, software cannot repair that unpowered state: investigate connector/wake hardware before installing a speculative firmware fix.

## Task 2: Board power and boot input contract

**Files:** create `firmware/VolcanoDial/board_power.hpp`; modify `VolcanoDial.ino`; add `tests/battery-boot.test.mjs`; extend `tests/interaction_test.cpp` and `tools/Test.ps1`.

**Interfaces:** board wrapper `beginPower()`, `clearUnusedRtcWake() -> bool`, `releasePowerLatch()`, and `BootDiagnostics`; testable `BootInputGate::update(bool anyHeld, uint64_t now) -> bool` returns armed only after 100 ms continuously released. Input-specific gates prevent one stuck input from fabricating another input's edge.

- [ ] Add failing production-path tests: no USB-ready dependency; power hold before blocking initialization; local/key/touch boot holds and releases produce zero activation/fan requests; encoder establishes a baseline.
- [ ] Run the new tests and confirm failures represent the intended missing behavior, not harness/setup failures.
- [ ] Implement the evidence-supported board initialization, preserve pinned-library hold behavior, verify board ID, and add reset/RTC/boot diagnostics. Verify `disableIRQ`/`clearIRQ` effects against pinned RTC code and readback without clearing calendar time.
- [ ] Run new tests and existing interaction/hold/cooling recovery tests. Add the new test entry to `tools/Test.ps1`, which explicitly lists Node files.
- [ ] Commit this tested change separately when implementation is authorized.

## Task 3: User inactivity and intentional display wake

**Files:** extend `display_idle.hpp`; modify main loop/input/queue paths in `VolcanoDial.ino`; add `tests/battery-idle.test.mjs`; extend `tests/led-sleep.test.mjs`, `tests/display-command.test.mjs`, `tests/ui_test.cpp` and `tools/Test.ps1`.

**Interfaces:** `PowerIdleClock::activity(uint64_t now)`, `becameSafeIdle(uint64_t now)`, `elapsed(uint64_t now)`; `WakeReason` values for local input, explicit remote input, completion/checkpoint/balloon-ready, new fault and background change. Rendering remains driven by `visualHash`; wake permission does not.

- [ ] Add failing tests for connection/message/temperature/key-alive churn across dim/off and the 30-minute cutoff; passive HTTP polls and sensor samples do not extend the deadline.
- [ ] Test completion/checkpoint/new fault wake once, repeated identical faults stay quiet, and the first held/rotary wake gesture performs no action. A new completed cooling obligation starts a fresh idle interval rather than causing immediate surprise cutoff.
- [ ] Implement independent inactivity and wake intent. Preserve active-workflow/checkpoint visibility and stop/air-hold behavior.
- [ ] Run focused tests, then the full appropriate host suite. Commit after review when executing.

## Task 4: One safe shutdown path, including USB standby

**Files:** extend `power_policy.hpp` and board wrapper; modify worker and local menu integration in `VolcanoDial.ino`; add `tests/battery-shutdown.test.mjs`; extend `tests/ui_test.cpp`, `tests/browser.test.mjs`, and `tools/Test.ps1`.

**Interfaces:** `ShutdownState { Awake, Confirming, UsbStandby, Blocked }`, a worker-owned admission fence, and `ShutdownBlockReason` derived from the full `PowerSafety`. Add `OutputOffEvidence` with status validity, timestamp, connection generation, output owner, and request epoch; default false snapshot flags are not evidence. A surviving LOW request means powered standby/unknown external supply until positively identified; it does not prove USB presence.

- [ ] Add failing tests for a queue/start race, a held WAKE button, stale/unknown output telemetry, Hue timeout, and cooling recovery. All must prevent unsafe cutoff and issue zero ON/start requests.
- [ ] Test managed-output obligation separately from connection state: a lost BLE link after output ownership must not become confirmed OFF through default false flags; an idle boot with no managed session/persisted obligation can shut down without starting a connection. Test auto-shutdown retries only at 0/30/120 seconds, then quiet blocking; user activity cancels pending idle shutdown while Stop stays effective.
- [ ] Add valid/invalid, wrong-generation/owner/epoch and 1,499/1,501 ms OFF-evidence tests after a delayed Hue call. Require fresh valid BLE OFF immediately before release when no authoritative managed-plug cutoff occurred. When Hue intentionally powers the Volcano off, accept fresh pre-switch BLE OFF plus just-confirmed same-plug OFF and unchanged ownership/request identity instead of requiring BLE from an unpowered device. Bypass, mismatched plug, stale pre-switch evidence, pending cooling and cancelled requests reject that branch.
- [ ] Test successful OFF then LOW with USB absent; LOW with continued external supply; no automatic HIGH after 200 ms; intentional wake re-arms only after release. Test OFF-only retry backoff without screen/activity renewal or persistent startup requests.
- [ ] Route manual Dial AUS and existing Auto AUS through the shared guard. Disable/clear unused RTC wake, fence queued activations, release HOLD, and enter tested local-wake USB standby if still powered. Persist cooling obligations before any release; leave power on if preparation/RTC safety cannot be confirmed.
- [ ] Implement proposed 30-minute default and 0–240 range through the existing setting; preserve stored values, plus 30/90 display timing. Recheck all safe-state conditions immediately before release.
- [ ] Run focused and existing power/cooling/hold tests; build for the pinned target. Commit after review when executing.

## Task 5: Truthful UI and measured economy profile

**Files:** `ui_model.hpp`, `round_ui.hpp`, `VolcanoDial.ino`, `web/index.html`, `web/app.js`, manual and acceptance record; add/extend relevant UI, browser and display tests.

**Interfaces:** read-only status fields `powerState`, `shutdownBlockedReason`, `idleRemainingSeconds`, boot/wake diagnostic summary; capability flags for battery/charger telemetry. Status reads do not count as activity.

- [ ] Test distinct Display aus / Dial ausschalten / Auto AUS states, countdown, blocking copy and unknown battery/charger data. Tests cover the actual renderer/browser behavior, including a 240-pixel round layout preview.
- [ ] Add the proposed optional economy brightness 80/255, preserving existing brightness unless explicitly chosen. Test RFID disabled/enabled behavior and retain learned mappings. Do not quietly disable an existing user RFID workflow on migration.
- [ ] Measure normal/economy awake, screen-off, and latch-off current with Chain Key present/absent. Trial Wi-Fi modem sleep only if stop/hold freshness and Hue/BLE latency remain within existing tests; otherwise defer it.
- [ ] Re-embed web assets with `python tools/embed_web.py`, run the required host suite with `tools/Test.ps1 -ZigPath <zig.exe> -ArduinoJsonPath <ArduinoJson-folder>`, and build using `tools/Build.ps1`. Those angle-bracket paths are machine-local prerequisites to discover, not literal runnable paths.
- [ ] Update build/test evidence and installation history together. Do not overwrite historical installation proof with a merely built version. Commit when executing.

## Task 6: Optional plug-in monitor, after electrical acceptance

**Files:** create `battery_monitor.hpp`; integrate external I2C and status in `VolcanoDial.ino`; extend UI/browser; create `tests/battery-monitor.test.mjs`; update build dependencies, `tools/Test.ps1`, hardware guide and acceptance record.

**Interfaces:** `BatteryReading { optional batteryPresent, voltageMv, percent, chargeTrend, chargingState, sampleAgeMs, valid }`; separate `BatteryCapabilities`. `chargingState` and `batteryPresent` stay unknown with this MAX17048/TP4057 wiring. USB can energize the battery node without a cell; sensor response is not presence detection. `BatteryMonitor::sample(uint64_t now)` uses bounded bus operations, external GPIO13/15, and the PaHub channel selected below.

- [ ] First confirm retained PH connector, complete harness polarity, PaHub upstream voltage and no back-power during cutoff. If the original adapter has no compatible detachable connection, obtain a professionally supplied tested complete adapter; do not ask the user to cut/repin/solder it.
- [ ] Configure PaHub at 0x70, channel 0 only; gauge at 0x36. Start external bus at 100 kHz and use bounded timeout/retry; do not reinitialize the internal display/touch/RTC bus or touch PORT.B UART.
- [ ] Add failing tests for absent gauge, invalid/NaN/range values, timeout/stale data, 100% without charger-complete evidence, low SOC hysteresis and no wake from samples. Add USB/no-cell gauge-response tests: neither batteryPresent=true nor confirmed charge/full can be synthesized from valid-looking readings. Default active sampling every 5 s; stale after 15 s; background idle every 30 s with a corresponding 90 s stale limit. Never block the input loop for these intervals.
- [ ] Implement optional monitor support. Display 20% low/10% critical SOC with 3-point hysteresis as proposed, subject to cell-load acceptance. Critical battery blocks new starts and requests safe stop/cooling; it cannot bypass the shutdown guard.
- [ ] Verify added board current in latch-off and inspect LED/pull-up/back-power effects. Quoted IC microamp figures are not whole-prototype measurements. Measure charge behavior without adding a second charger.
- [ ] Run monitor and full required suite, preview UI, build, and record physical measurements. Pin any new library version after verifying the actual API. Commit only tested changes when executing.

## Physical acceptance before calling this fixed

- [ ] At least 20 battery-only off/WAKE/start-to-idle cycles, including full supply removal and held startup inputs. Zero unsolicited starts, air, or outlet-ON requests.
- [ ] USB only; battery only; both connected; remove USB while running idle; request shutdown with USB attached and then remove USB. Confirm outputs and latch behavior in every case.
- [ ] Manual shutdown, configured idle cutoff, disabled cutoff, new activity just before deadline, and cooling/OFF failure cases. Confirm the physical WAKE control starts after latch-off.
- [ ] Quiet soak: at least 2 hours after battery cutoff, without any RTC timer wake, plus overnight observation. Separately verify background OFF-only recovery remains safe.
- [ ] App-only installation after the device is inactive and cooling obligations are resolved; preserve/compare library and settings. Installation was subsequently authorized; record actual upload and post-install checks separately from build success.
