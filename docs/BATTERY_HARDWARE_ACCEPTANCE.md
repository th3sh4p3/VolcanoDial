# Battery / USB acceptance record — 4 November 2026

**Later same-day correction:** with USB, battery and adapter all attached (explicitly confirmed by the user), healthy COM3 enumeration and actual USB `info`/`status` replies were verified. The missing connection sound did not indicate loss of data. USB plus an attached battery works in this observed configuration; the earlier disappearance does not establish a continuing adapter fault. The user can also run on battery after USB-assisted startup, but battery-only cold start still fails. A concrete early-HOLD API error was found in 0.2.17 and corrected for 0.2.18; see [HOLD investigation and next physical test](BATTERY_HOLD_FIX_0.2.18.md). Measured charging remains unverified.

**Software update:** 0.2.17 subsequently installed app-only with verified write hash; direct USB and Wi-Fi readback confirmed the version, idle outputs and preserved library/settings. This does not close the hardware checks below.

## Observed on this prototype

- Direct USB read confirmed installed **0.2.16**, idle, HEAT/AIR off and no pending cooling obligation before installation work. Library and settings were backed up privately.
- With the existing battery adapter fitted, Windows did not enumerate the Dial: no live Espressif USB composite device and no COM port. The firmware remained reachable over Wi-Fi during the earlier checks.
- The user explicitly confirmed: **the complete two-wire battery cable is plugged into the Dial socket and its far end is disconnected**. No cell, gauge or charger is attached at the far end. It is not a test with one individual conductor touching one contact.
- Removing the adapter from the Dial and reconnecting USB restored the connection sound. Windows then showed the same Espressif device and **COM3, present, problem code 0**. The USB console answered `info` with version 0.2.16. No driver replacement or new firmware was involved in that restoration.
- Historical driver records show a successful USB serial installation on 2 November. Earlier driver-cleaner activity is not evidence that the current driver is faulty; the restored device works with Windows' existing drivers.

The initial observations suggested an association with adapter installation, not an established electrical cause. The later successful both-connected data exchange supersedes a claim of continuing USB incompatibility. Cable fit, mating contacts, insulation and rail behavior remain physically unmeasured.

## USB data and charging are a required combined function

The [official Dial v1.1 documentation](https://docs.m5stack.com/en/core/Dial_v1.1) specifies USB Serial/JTAG and a built-in lithium charging circuit. Its linked [power schematic](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/499/Sch_M5Dial.pdf), page 2, shows TP4057 supplied from +5VIN and the two battery contacts connected to VBAT_IN and GND. There is no adapter-controlled USB data switch in this circuit. **A correctly fitted, electrically compatible battery connection should retain USB data while the existing charger charges the cell.** This is a circuit-based conclusion, not a completed charging-current measurement on this prototype.

The proposed [MAX17048 board](https://learn.adafruit.com/adafruit-max17048-lipoly-liion-fuel-gauge-and-battery-monitor/pinouts) has two equivalent battery ports connected in parallel. It measures voltage and estimates SOC; it does not replace the charger, repair the Dial socket, or reroute USB data. PaHub adapts its I2C connection. Neither is a demonstrated repair for the present failure. Keep that upgrade conditional on repairing/accepting the existing battery connection first.

The previously suggested ADA3922 was a connector **candidate**, not a proven Dial harness. Matching 1.25 mm pitch did not establish mating geometry, clearance or polarity. The confirmed detachable PH battery plug makes a finished replacement harness possible, but no exact ready-made replacement has been electrically and mechanically verified for this assembly. Do not present the monitor shopping list as a complete repair kit.

## Required inspection and acceptance

Do not rewire the assembly based only on cable colours or a missing Windows sound. If the earlier physical USB failure recurs, inspect it with all power removed against M5Stack's [connector drawing](https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/products/core/M5Dial/1.25WT-2P.pdf), including module seating, insulation, continuity and polarity. A qualified supplier/technician can supply a finished tested replacement if one is needed. The user's requirement remains no soldering, repinning or cable fabrication by the user. Do not add a second charger in parallel as a workaround.

Acceptance must establish:

- [x] USB-only enumeration and USB console data with the adapter removed.
- [x] Later same-day USB enumeration and real data exchange with USB, adapter and battery all connected.
- [ ] USB data remains available with a verified empty adapter fitted and Stamp correctly seated.
- [ ] USB data and positive battery charge current together with the actual EREMIT battery fitted; charging within its specifications and correct termination.
- [ ] Stable USB/battery operation and supply handover with Chain Key attached and detached.
- [ ] Battery-only physical WAKE after full supply removal; held startup inputs never activate a workflow or air.
- [ ] Repeated battery latch-off / deliberate wake cycles, USB-powered standby, and USB removal after standby.
- [ ] Rail minima at startup, awake/screen-off/latch-off current, at least 20 startup cycles and a two-hour/overnight quiet soak.
- [ ] Optional gauge polarity, PaHub voltage levels, stale/absent readings and no back-power path before enabling its firmware option.

Software tests cannot close the unchecked electrical and physical items. No completed battery-only startup, charging, runtime or cutoff acceptance is claimed here.
