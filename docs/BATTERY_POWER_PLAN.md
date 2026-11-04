# Battery power investigation and proposed design

**4 November update, firmware 0.2.20:** the user explicitly changed manual shutdown policy. Confirmed **Dial AUS** overrides an active program and pending cooling: stop HEAT/AIR, confirm the configured Hue outlet OFF by default, then release HOLD. Automatic idle shutdown retains the guards described below. Missing OFF confirmation remains a visible error. The wheel shortcut opens confirmation after three seconds; a separate action is required. See [current behavior](POWER_SHORTCUT_0.2.20.md).

Original investigation: 3 November 2026. **Update 4 November:** implementation and USB installation were subsequently authorized. USB now works with the disconnected battery cable removed; direct USB confirmed pre-update firmware 0.2.16. See [implemented software](BATTERY_FIRMWARE_0.2.17.md) and [hardware acceptance / USB charging investigation](BATTERY_HARDWARE_ACCEPTANCE.md). The history below describes the original research evidence.

## Established setup and installation history

The prototype uses an M5Stack Dial v1.1 K130-V11, an EREMIT 803040 protected 3.7 V / 1,000 mAh LiPo, and the existing adapter to the Dial's 1.25 mm two-pin battery socket. The optional Chain Key U206 uses the black PORT.B (GPIO1/2 UART); PORT.A (GPIO13 SDA / GPIO15 SCL) is available for a battery monitor. USB-C already supplies the Dial and its built-in charger. The user confirmed on 3 November that the original battery PH plug remains detachable. The completed adapter's exact pin mapping and its polarity relative to the proposed Adafruit gauge are not recorded.

**The last documented installed firmware is 0.2.14**, not the version in the old release metadata:

| Evidence | Meaning |
| --- | --- |
| `docs/QUICK-ROSE.md`, first paragraph | Explicitly records 0.2.14 installed on the development Dial. |
| Commit `fce21e9`, README installation paragraph | Records 0.2.14 flashed with verified write hash, library/settings retained, outputs off. |
| Current README and source | Source/build 0.2.16; explicitly says the development Dial has not been updated to it. |
| `docs/verification.json` and `docs/PRUEFBERICHT.md` | Historical 0.2.7 installation evidence, not the newest installation record. |
| Current USB investigation | Windows port/device enumeration returned no accessible matching device. No live firmware version was obtained. Browser inspection also ended because the computer-use service could not determine the current browser URL confidently enough to enforce its policy. |

This establishes the recorded installation baseline, not proof that no unrecorded update has occurred. Do not claim a new live installation check.

## Symptoms and what the evidence supports

1. **Battery cold start fails:** after removing USB and battery, reconnecting only the battery does not produce a usable startup, including the attempted front-wheel press. The earlier apparent successful press occurred with USB attached and is not a successful battery-only test. Battery insertion alone need not boot the Dial: the documented startup control is the physical WAKE button. Verify the actual actuator, rather than assuming touch, ring rotation, or the external Chain Key can restore a cut supply.
2. **USB start followed by battery operation works:** the battery can support the running board in at least that observed condition. This does not prove cold-start voltage stability, charging completion, or correct wake-latch operation.
3. **Automatic screen sleep does not turn the device off:** on the documented installed 0.2.14 this is expected. Auto AUS was added later, in 0.2.16 (`bd28f0e`). Screen sleep only changes brightness and accessory LEDs; the processor and radios continue running. Manual Dial AUS exists in 0.2.14, but its battery operation was not physically accepted.
4. **Apparent random waking/startup:** the source has an identifiable display-wake path for *any* change of `visualHash`, including connectivity, messages, temperature, and accessory availability. These changes also reset the current auto-off clock. That explains a possible spontaneous screen wake and delayed shutdown; it does not establish that the reported event was a screen wake, an ESP reset, an RTC power wake, or an actual program start.

The source starts with `M5Dial.begin(...)`. The build pins M5Unified 0.2.25, whose `M5Unified.hpp::begin` already asserts GPIO46 early on ESP32-S3. Therefore **a missing HOLD initialization is not a proven root cause**. Check the actual built dependency, board detection, power rail during the WAKE press, and reset reason before deciding whether explicit application-level initialization changes anything. The current sketch has no `esp_deep_sleep_start()` call: its ordinary display sleep is not ESP deep sleep.

The RTC is battery supplied and can trigger hardware wake. Although the sketch has no explicit timer/alarm cleanup, pinned M5Unified defaults `disable_rtc_irq=true` and calls `Rtc.disableIRQ()` during startup. A leftover RTC alarm is therefore a weaker hypothesis, not an established missing cleanup step. Capture any pre-cleanup IRQ evidence before `M5Dial.begin`, or label later readings as post-cleanup. Existing OFF-only Hue cooling recovery can also reconnect after a reboot; preserve this safety function while making its purpose clear.

Primary references: [Dial v1.1 power behavior](https://docs.m5stack.com/en/core/Dial_v1.1), [pinned M5Unified startup implementation](https://github.com/m5stack/M5Unified/blob/0.2.25/src/M5Unified.hpp), [Dial schematic](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/499/Sch_M5Dial.pdf).

## Approaches and recommendation

| Approach | Benefit | Limitation |
| --- | --- | --- |
| Existing hardware, software improvements first — recommended first phase | Addresses screen wake, idle timing, shutdown policy, startup diagnostics, and input handling without purchases. | Cannot create battery voltage, percentage, or charger-state measurements. Electrical startup faults still need physical diagnosis. |
| Keep existing charger/battery; add an I2C fuel gauge — recommended second phase | Percentage, voltage, low-battery warnings; preserves USB-C charging and existing controls. | Needs compatible ready-made cables, verified adapter polarity, new firmware support, and electrical acceptance. Gauge alone does not report charger completion. |
| Replace power architecture with external charger/UPS | Can provide current and charger-state telemetry with the right design. | Investigated boards do not form a verified no-rewiring drop-in solution for this Dial and existing battery. Do not buy one as an assumed repair. |

These are recommendations, not choices the user has approved. Implementation remains a later task. The detailed [hardware research](../hardware/BATTERY_RESEARCH_2026-11-03.md) includes a single-retailer gauge BOM and its remaining compatibility conditions.

## Proposed behavior without new hardware

### Startup and input

- Use the board's existing power latch. Where needed, assert HOLD at the earliest safe application point, before display, storage, radio startup, or waits; verify that subsequent library initialization preserves it and detects the Dial correctly.
- Starting from hardware off opens an idle home screen. The held power-on press, boot-time touch, held Chain Key, and their releases cannot start or advance a program, select a menu action, or request air. Arm each input only after a stable release; encoder startup establishes a baseline without generating selection input.
- No USB-connection wait may gate battery startup. Record board ID, firmware/build identity, uptime, ESP reset cause, available wake cause, RTC IRQ evidence, and a bounded boot count. Power-on reset does not prove which supply or button caused it.
- Separate an ESP reboot from a display wake in diagnostics. Capture wake reasons in a small RAM ring; persist only bounded boot/fault evidence when justified, avoiding repeated flash writes.
- Disable and clear unused RTC alarm/timer IRQ sources after initialization and before deliberate power cutoff. Verify the pinned RTC API's register effects and readback; retain clock/calendar time. Do not schedule periodic wakeups.

### Display sleep, idle time, and shutdown

- Retain screen dim/off defaults of 30/90 seconds and the first-gesture-wakes-only behavior.
- Introduce a dedicated inactivity clock. Reset it only on meaningful, accepted user activity, or when a protected active/cooling state completes and the device first becomes safely idle. Routine status GETs, I2C samples, Wi-Fi/BLE changes, RFID presence, and renderer changes do not reset it. An explicit remote wake/control is user activity; passive browser polling is not.
- Only intentional user input or a newly actionable event may wake the display. Completion/checkpoint/balloon-ready and a newly latched safety fault can wake it once. Connectivity churn, repeated error text, gauge updates, and successful background recovery cannot keep it awake.
- Extend the source's existing Auto AUS instead of adding a second shutdown path. Proposed default remains **30 minutes**, range 0–240, with 0 disabled. An explicit stored choice is preserved. Make manual shutdown immediately available when safe, without waiting for the timer.
- Preserve the strongest current guards: active workflow including a checkpoint, hose readiness/heating, HEAT/AIR requested or active, pending/unknown OFF, queued activation, held demand, and pending Hue cooling prevent power cutoff. With Hue enabled, confirm the configured outlet OFF before releasing the latch; on failure remain powered and show the reason. Allow bounded retries of OFF-only confirmation without new ON/start commands or endless screen wakes.
- Track whether this Dial owns an unresolved output obligation. A disconnected snapshot with default false flags is not OFF confirmation after the Dial has controlled the outputs. Conversely, an idle boot with no managed session or persisted obligation may shut down without connecting to or starting the Volcano just to manufacture telemetry. Proposed unattended shutdown retries are at 0, 30 and 120 seconds only; afterwards remain quietly blocked until deliberate user retry or completion of an already-owned safety recovery. New user activity cancels an idle shutdown attempt and restarts inactivity; Stop always retains priority.
- Make OFF evidence explicit: fresh BLE status must be valid, generation/owner matched, no older than the existing 1,500 ms window, with requested and observed HEAT/AIR OFF. Revalidate after blocking calls immediately before latch release. If confirmed Hue OFF deliberately removes the Volcano supply, do not require an impossible BLE read from the now unpowered device: use fresh pre-switch OFF plus just-confirmed OFF of the same managed plug, unchanged request/ownership identity, and the final safety gate. A bypassed/mismatched/unconfirmed plug is not that alternative. A persisted cooling obligation still blocks release until its normal completion.
- Clear unused RTC IRQs, stop admitting work, and set GPIO46 LOW only after the safety gate succeeds. Do not restore HIGH just because USB kept the processor alive. Enter a defined USB-powered standby with screen/LED/radios off as far as supported, and a tested intentional local wake path. USB removal should then leave the battery latch released and allow hardware cutoff. Verify this physically before claiming it works.
- Battery-only off uses the board latch, not an unproven generic ESP deep-sleep wake configuration. The external Chain Key, touch and rotation are not promised as wake sources after their power is cut. True zero current requires physical battery disconnection; latch-off retains small standby consumption.

### Power UI and energy use

- Keep separate labels for **Display aus**, **Dial ausschalten**, and **Auto AUS**. Show an inactivity countdown and a concrete blocking reason such as “Abkühlung läuft”, “Ausgänge nicht bestätigt”, or “Hue nicht erreichbar”.
- Before shutdown show a short “Zum Einschalten WAKE drücken” explanation. Under USB distinguish standby from actual power removal; an awake CPU after LOW is not sufficient evidence to label the supply USB.
- Without a monitor show “Akkustand nicht verfügbar” and charging state “unbekannt”. Do not infer battery present, 100%, charger complete, or mains power from generic M5 power API sentinels or USB host enumeration. Battery runtime counters can be labelled usage counters, never remaining-charge estimates.
- Offer a user-selected economical profile (proposed brightness 80/255, existing timing values retained). Disable RFID initialization/polling when RFID is not being used; preserve learned mappings and provide an explicit way to enable scanning. Stop unused speaker/Stamp RGB activity. The Chain Key LED already dims to zero; its controller still draws power while the Dial remains on.
- Evaluate Wi-Fi modem sleep and lower idle processing only in an isolated test build. Enable only if BLE, Hue response, stop/hold deadlines, and local browser operation remain correct. No claimed savings or runtime until measured. Keep radio behavior unchanged during active safety monitoring in the first patch.

## Optional monitor UI

Use capability-aware fields, rather than assuming every device has telemetry: `batteryPresent`, `batteryVoltageMv`, `batteryPercent`, `chargeTrend`, `chargingState`, `sampleAgeMs`, and `valid`. Unsupported/failed/stale values are null/unknown. The MAX17048 provides voltage, modelled SOC, and a slow SOC trend; it does not provide measured charge current or TP4057 charger status. **Battery presence remains unknown for this BOM:** USB/the charger can energize the battery node even without a cell, so an I2C response or plausible voltage does not prove a connected battery. Readings describe that node under the documented assumption of a fitted cell, not automatic cell detection. Include a USB-only/no-cell bench case and do not present its gauge response as proof of a battery.

Show percentage and voltage when valid, and “Ladung steigt (Schätzung)” only for a stable positive trend. Never translate 100% into “Laden abgeschlossen”. A later charger-status source is a separate capability. Proposed low/critical SOC levels are 20% and 10%, hysteresis 3 percentage points; calibrate against the actual cell under load. Low battery never bypasses cooling/output safety. A critical level blocks new starts and initiates the existing safe stop/off workflow, without pretending software can guarantee completion if the battery collapses.

## Acceptance and delivery

The [implementation plan](BATTERY_IMPLEMENTATION_PLAN.md) defines the code boundaries and test sequence. Battery cold-start, cutoff and re-wake must pass with USB absent. Repeat USB-only, battery-only, and both-supplies tests, including USB removal after standby. Test a quiet battery-only soak and retained cooling recovery separately. Preserve library, paired devices, temperature/fill settings, and thresholds during an app-only update.

No diagnosis or hardware kit is physically accepted by this document. No heating, air, outlet switching, firmware upload, or reset was intentionally commanded in this investigation. Procurement and firmware changes were not performed.
