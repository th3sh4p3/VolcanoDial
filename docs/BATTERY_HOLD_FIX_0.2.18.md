# Battery startup HOLD correction — 0.2.18

Follow-up investigation on 4 November 2026 found an API error in the new 0.2.17 board wrapper. `digitalWrite(46, HIGH)` was called before Arduino `pinMode(46, OUTPUT)`. The pinned ESP32 Arduino core 3.3.12 ignores that write until its peripheral manager has registered the pin as GPIO. Enabling output afterwards can therefore present LOW before M5Unified initializes HOLD. USB can mask that transient because it independently supplies the board.

The correction uses the same low-level sequence as pinned M5Unified 0.2.25: preload GPIO46 HIGH with `m5gfx::gpio_hi`, then enable output with `m5gfx::pinMode`. LOW release uses the same API, independent of Arduino peripheral registration. This corrects the demonstrated software error; one physical battery cold-start has now passed; repeated cycles and brief WAKE remain to be tested. It does not establish that all earlier startup failures had this cause.

Two tests compile the actual `DialPowerIO::latch` body with a model of the pinned core's GPIO ownership behavior. Both failed before the correction and pass afterwards. The complete host suite now has 145 passing cases. The earlier fake-IO board-policy tests did not exercise this hardware API boundary, which is why they missed the error.

## Updated USB evidence

The user confirmed USB, the battery adapter and the battery were all connected. Windows reported healthy COM3/Espressif devices; actual USB `info` and `status` requests returned 0.2.17 and an idle, filesystem-healthy device. Wi-Fi subsequently connected and the current library was backed up. **USB data and an attached battery work together in the observed assembly.** A missing Windows connection sound is not evidence of failed data transfer. The earlier disappearance is historical; its exact cause was not established. No cable replacement or extra charging hardware is justified from that sound alone.

The user also confirmed that the Dial remains operational on battery after USB is removed. This demonstrates sustained battery operation after USB-assisted startup, not successful cold startup or measured charging. Battery polarity/voltage and charging current have not been measured; the user has no multimeter.

## First physical confirmation

After USB removal and a five-second battery disconnection/reconnection, the user held WAKE for about two seconds and confirmed that the Dial started and stayed on after release. A Wi-Fi readback then showed 0.2.18, power-on reset (reason 1), boot count 6, idle, HEAT/AIR off and no cooling/output obligation. This is one confirmed battery-only cold-start cycle, not a full repeated-cycle or runtime acceptance.

## Remaining physical checks after installation

With the Dial idle and no pending cooling/OFF duty, disconnect USB, then use Dial AUS if available. With only the existing battery attached, press and hold the physical WAKE control through startup and release it. The expected result is sustained idle with no program/HEAT/AIR activation. Repeat with a brief WAKE press and, separately, after complete supply removal. Record whether it remains completely dark, flashes then stops, runs only while held, or stays on. These observations distinguish remaining power/startup failures; they cannot be manufactured by host tests.

Charging current/termination, rail minima, repeated cutoff/wake and quiet-soak acceptance remain open. The optional MAX17048 gauge remains disabled and does not replace the existing charger.
