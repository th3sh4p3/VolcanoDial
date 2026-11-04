# Battery firmware 0.2.17

**Superseded by 0.2.18:** a follow-up found and corrected an early HOLD GPIO API error that the policy-only tests missed. Actual USB data with the battery and adapter connected now works; an ongoing cable fault is not established. See [HOLD correction](BATTERY_HOLD_FIX_0.2.18.md).

Implemented on 4 November 2026. Installation evidence is recorded separately in `verification.json`; a successful build alone is not an installation.

## Operation

**Display aus** only turns off the display and accessory LED. Work and safety supervision continue. **Dial AUS / Ausschalten** requests the shared safe shutdown path. On battery this releases HOLD; if an external supply keeps the CPU running, it enters standby with the display, speaker, RFID and Wi-Fi off. It does not reassert HOLD automatically. Use the physical **WAKE** control to switch on again. Its startup press is consumed until release, so waking does not start a program. Touch, encoder rotation and Chain Key are not promised as wake sources after hardware power removal.

**Auto AUS** uses a separate inactivity clock: default 30 minutes, range 0–240, with 0 disabled. Existing values and display dim/off timings are retained. Passive browser polls, sensor updates, radio reconnects and redraws do not renew this clock or wake a sleeping display. Active work, output demand and cooling prevent unsafe shutdown. The interval starts afresh after protected work finishes. Automatic OFF retries are bounded to the first attempt, 30 seconds later and 120 seconds after the first; further retries need new user activity.

Shutdown requires inactive outputs, no queued start/held demand and no unresolved cooling or output obligation. Managed outputs require fresh, matching OFF evidence. The exception after confirmed Hue power removal requires the same owned plug and a fresh pre-switch OFF check. RTC alarm/timer cleanup and final activity checks precede HOLD release. Failed confirmation retains power and exposes a reason. The UI and Chain Key task stop their output work before release.

Before every HEAT/AIR ON write, a separate NVS output-owner record is saved. A reset restores only OFF recovery, never a program or ON command. The record is cleared only after matched OFF confirmation; storage failures retain the obligation. This is independent of the existing persistent Hue cooling record.

## Settings and telemetry

The browser's Gerät & Diagnose card adds:

- **Eco**, off by default: caps effective display brightness at 80/255 while retaining the configured brightness.
- **RFID lesen**: no scanning or reader initialization while disabled. Existing learned mappings enable scanning on migration; stored mappings remain intact.
- **PaHub / MAX17048**, disabled by default until the hardware has been fitted and accepted.
- Firmware version, unknown/estimated battery information, Auto AUS countdown or blocking reason. The Dial's Geräteinfo also shows version and power information.

The optional gauge uses external PORT.A, PaHub 0x70 channel 0 and MAX17048 0x36. It samples every 5 seconds during operation and 30 seconds while idle; readings become stale after 15/90 seconds. Low SOC is 20%, critical 10%, each with three-point recovery hysteresis. A confirmed critical state blocks new starts/ON and requests safe stop; later failed readings become unknown but do not remove that inhibit. Valid recovery or explicitly disabling the monitor clears it. Cooling/OFF safety is retained.

Neither the gauge nor the existing charger wiring proves battery presence, charging or full-charge completion. Those fields remain unknown even if voltage/SOC look plausible or show 100%. No runtime/current-saving claim is made without measurement.

Status includes `powerState`, `shutdownBlockedReason`, `idleRemainingSeconds`, `outputOffPending`, `backgroundRecovery`, boot count/reset/wake causes and a `battery` object. Read-only status requests do not count as user activity.

## Verification and remaining hardware work

143 automated host cases plus native safety/storage/UI checks passed. The actual shutdown branch and output-writing method are tested with external transports substituted. Tests reproduced the background-wake bug, queued-shutdown activity race and all four important independent-review findings before their corrections. The 240-pixel round info view was rendered and inspected.

The [hardware acceptance record](BATTERY_HARDWARE_ACCEPTANCE.md) remains authoritative for physical limitations: USB returned when the disconnected two-wire battery cable was removed from the Dial socket. Actual USB data with the adapter and battery connected was subsequently confirmed; charging current and cold startup remain to be measured. A monitor board does not repair it. Battery-only startup, charging current/termination, cutoff current, repeated wake cycles and the quiet soak remain physical acceptance tasks.

Implementation decisions: work stayed on the existing IDE feature branch to preserve the approved planning files; one integrated implementation commit covers the shared worker/power changes. The optional gauge remains disabled until accepted, so no battery telemetry is promised before fitting it. Electrical acceptance remains open because software and remote USB tests cannot prove rail behavior; treating these tests as a hardware repair would risk a wrong purchase or a false completion claim. The existing charger remains the sole charging path, based on the schematic; adding the monitor is conditional on repairing the current connection first.
