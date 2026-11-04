# Battery extension research — 3 November 2026

Status: researched design and procurement candidates, **not a physically validated kit**. Retain the existing M5Stack Dial v1.1, EREMIT 803040 protected 1S battery, Chain Key and original USB-C connector. User assembly must use finished connectors only, without soldering, crimping, cutting, repinning or PCB-jumper modification.

See the [software findings and design](../docs/BATTERY_POWER_PLAN.md). Direct USB confirmed pre-update firmware 0.2.16 on 4 November. See the [USB / charging acceptance record](../docs/BATTERY_HARDWARE_ACCEPTANCE.md): fitting the disconnected two-wire battery cable removes USB enumeration; removing it restores COM3. The monitor below does not repair this fault. USB data and the existing charger must coexist.

## Charging and power already available

The Dial already has a LiPo charging circuit and battery input. USB and a correctly connected compatible battery are intended to coexist. Its [schematic](https://m5stack-doc.oss-cn-shenzhen.aliyuncs.com/499/Sch_M5Dial.pdf) shows a TP4057 charger and an RTC supplied from the battery input. The green terminal is a different 6–36 V input, not the 3.7 V battery socket. [M5Stack's board documentation](https://docs.m5stack.com/en/core/Dial_v1.1)

Adding a second charger in parallel is not the proposed upgrade. The existing two battery wires carry battery voltage and ground; they do not add digital charger telemetry. An extra percentage gauge does not repair a failed physical WAKE circuit.

## Most practical measurement upgrade

Use an **Adafruit MAX17048 breakout, product 5580**. It has two equivalent JST-PH battery ports, so the battery and existing Dial adapter can share the same battery node through finished connectors. It reads voltage, modelled state of charge and a slow charge/discharge trend over I2C. It is powered from the battery, so it can remain attached while the Dial is off. [Adafruit product](https://www.adafruit.com/product/5580), [connector/power description](https://learn.adafruit.com/adafruit-max17048-lipoly-liion-fuel-gauge-and-battery-monitor/pinouts)

The chip's trend is **not measured charging current or the charger's “done” output**. A 100% SOC estimate is not proof charging has terminated. Report true charger state as unknown unless a separate verified hardware source is added. The [MAX17048 datasheet](https://www.analog.com/media/en/technical-documentation/data-sheets/MAX17048-MAX17049.pdf) describes model-based SOC and CRATE; it lists 23 µA active and 3 µA hibernate for the IC, not the complete breakout/prototype.

It also does not establish physical battery presence: USB and the Dial charger can energize the same battery node after the cell is unplugged. A sensor response/voltage must not be labelled “battery detected”; keep presence unknown and describe SOC as an estimate for the fitted battery. Include an explicit USB-only/no-cell acceptance case.

### Important signal-voltage issue

The Dial's PORT.A supplies 5 V but connects to 3.3 V ESP32 GPIO. On the Adafruit breakout, the I2C pull-ups connect to its connector supply. A direct Grove-to-QT cable would therefore put 5 V pull-ups on the Dial bus. **Do not approve that direct connection merely because both product pages say “3–5 V”.** The [Adafruit schematic](https://github.com/adafruit/Adafruit-MAX17048-PCB/blob/main/Adafruit-MAX17048-STEMMA.sch) was checked for these nets.

A plug-in isolation/translation boundary can be provided by **M5Stack PaHub v2.1 U040-B-V21**. Its actual schematic has the PCA9548AP and upstream bus pull-ups on a regulated 3.3 V rail. Its downstream channel accepts the monitor's higher pull-up voltage; the mux's voltage-translation behavior separates it from the MCU bus. This is a schematic-supported design inference, not a tested prototype guarantee. Use this exact revision and verify actual upstream highs before accepting the build. [PaHub v2.1](https://docs.m5stack.com/en/unit/Unit_PaHub_v2.1), [manufacturer schematic image](https://static-cdn.m5stack.com/resource/docs/products/unit/Unit-PaHub2.1/img-103440a9-d7e4-4aab-b784-825aa9b35614.png), [PCA9548A datasheet](https://www.ti.com/lit/ds/symlink/pca9548a.pdf)

The extra hub is larger than a simple cable, but avoids modifying boards or wires. It requires firmware channel selection; it is not a firmware-free add-on. It also allows later I2C expansion.

## Single-retailer bill of materials

**Mouser's German storefront** lists all four required electronic items. It serves Germany but is not a German-headquartered local shop. This is the most complete single-retailer route found. Listings below showed stock in the available search results; search snapshots vary, and current checkout availability, VAT and shipping must be rechecked. No purchase/cart was created.

| Qty | Item / retailer order number | Listed unit price | Purpose |
| --- | --- | --- | --- |
| 1 | [Adafruit MAX17048 — 485-5580](https://www.mouser.de/de/ProductDetail/Adafruit/5580?qs=T%252BzbugeAwjhew%2FKScdGf5g%3D%3D) | €5.12 | Assembled gauge board, JST-PH and QT connectors. |
| 1 | [M5Stack PaHub v2.1 — 170-U040-B-V21](https://www.mouser.de/de/ProductDetail/M5Stack/U040-B-V21?qs=7%2F6SraaimPSOsSMm5j8qPw%3D%3D) | €5.12 | 3.3 V host-side mux; includes one 20 cm Grove cable according to M5Stack. |
| 1 | [Adafruit Grove-to-STEMMA QT cable, 100 mm — 485-4528](https://www.mouser.de/de/ProductDetail/Adafruit/4528?qs=OlC7AqGiEDmHEtHHQiIw7w%3D%3D) | €1.68 | PaHub channel 0 to gauge QT connector. |
| 1 | [Adafruit JST-PH two-pin jumper, 100 mm — 485-4714](https://www.mouser.de/de/ProductDetail/Adafruit/4714?qs=hd1VzrDQEGi2qAbAJE0pRQ%3D%3D) | €0.817 | Gauge's second battery port to the retained PH mating end of the existing Dial adapter. |

Displayed electronic subtotal: **about €12.74**, before any applicable VAT and delivery; approximately €15.16 with 19% VAT *if* those displayed figures exclude tax. This is not a delivered quote. Order one of each. Do not assume a jumper comes with the gauge: retailer/manufacturer wording differs, so the BOM includes it explicitly.

Reuse the existing USB data cable/5 V source, Chain Key/Grove cable and verified battery adapter. Mechanically, add an insulating board tray/cover and nonconductive retention/strain relief; reuse suitable existing parts. New ready-made retention parts must not compress the soft cell, cover the antenna or interfere with wheel/WAKE/USB access. Final case dimensions cannot be specified without actual assembled measurements. Allow at least the hub's 48 × 24 × approximately 11 mm and gauge's 25.7 × 20.3 × 7.2 mm **plus both mated connectors, cable bends, cell clearance and mounting clearance**. The earlier 60 × 92 × 63 mm INCLINE concept is not a verified fit.

**4 November qualification:** the existing adapter is now suspect because fitting its disconnected two-wire cable removes USB enumeration. It must be repaired/replaced and accepted before reuse. The four-item monitor BOM is therefore **not a complete repair kit**. A finished harness with proven Dial mating geometry, clearance and polarity is an additional unresolved requirement. Searches found generic PH-to-1.25 mm adapters, but none with confirmed compatibility with this exact Dial assembly; no fully verified one-shop repair-and-monitor kit can currently be promised. The [manufacturer's connector discussion](https://github.com/m5stack/M5Dial/issues/14) and [official drawing](https://m5stack.oss-cn-shenzhen.aliyuncs.com/resource/docs/products/core/M5Dial/1.25WT-2P.pdf) reinforce why connector pitch or a seller's generic JST label alone is insufficient.

### Germany-based alternative

Eckstein in Germany lists [AF5580 gauge (€7.95)](https://eckstein-shop.de/Adafruit-MAX17048-LiPoly-LiIon-Fuel-Gauge-and-Battery-Monitor-STEMMA-JST-PH-QT-Qwiic), [MS02040-B-V21 PaHub (€9.95)](https://eckstein-shop.de/m5stack-pahub-v2-1-i2c-multiplexer-hub-modul-pca9548ap-u040-b-v21), and [AF4528 cable (€2.95)](https://eckstein-shop.de/Adafruit-Grove-to-STEMMA-QT-Qwiic-JST-SH-Cable-100mm-Long). Some listings show conflicting country/availability placeholders and PaHub lead times of about four weeks. A separate exact PH jumper listing was not verified there. Ask the retailer to supply the complete tested connector set if choosing this route; do not call it a confirmed complete one-shop kit yet.

BerryBase lists [LC709203F ADA4712 (€7.40)](https://www.berrybase.de/en/adafruit-lc709203f-lipoly-liion-spannungs-und-ladestands-sensor) and a [Grove/Qwiic hub (€3.50)](https://www.berrybase.de/seeed-grove-qwiic-hub-kompatibel-mit-grove-qwiic-stemma-qt-modulen). It was not the preferred complete route: LC709203F is an older discontinued chip, and that hub's Grove-side pull-ups follow its supply, so its mere “level shifting” label does not establish safe 3.3 V host signaling from this Dial's 5 V port. [Seeed hub schematic](https://files.seeedstudio.com/products/103020292/doc/Grove-Qwiic-Hub_v1.0_SCH_190808.pdf), [Adafruit discontinuation note](https://learn.adafruit.com/esp32-s2-reverse-tft-feather/battery-monitor-lc709203f)

## Connector layout — conditional on the existing adapter

```text
Data/charging USB-C ─────────────────────────────────── Dial USB-C

EREMIT original PH battery plug ── MAX17048 battery port 1
                                  MAX17048 battery port 2
                                              │
                                      finished PH jumper 4714
                                              │
                                   existing verified PH-to-Dial adapter
                                              │
                                      Dial 1.25 mm battery socket

Dial PORT.A ── included Grove cable ── PaHub upstream port
                                      PaHub channel 0
                                              │
                                      Grove/QT cable 4528
                                              │
                                         MAX17048 QT

Dial black PORT.B ── existing Grove cable ── Chain Key IN/J1
```

The gauge's battery ports are parallel, not separate charger/load power converters. The Dial retains the sole charging circuit. The user confirmed that the original PH battery plug remains detachable. The original PH adapter must present the correct mating header for jumper 4714 and preserve **battery + to gauge + to Dial BAT+, and battery − to all GND**. EREMIT-to-Adafruit polarity equivalence and the finished adapter's exact pin mapping are not proven by the repository. Battery chemistry and connector pitch alone do not prove them. The [Adafruit instructions](https://learn.adafruit.com/adafruit-max17048-lipoly-liion-fuel-gauge-and-battery-monitor/pinouts) explicitly require checking third-party battery polarity.

If the user's final adapter is wired directly without a retained PH connection, this layout is **not** drop-in. A correctly made and tested replacement harness must be supplied finished; the no-cable-work requirement remains in force. Do not buy a generic 1.25 mm cable and assume fit/polarity. Do not depin the EREMIT plug as a hidden assembly step.

## What this buys, and what still needs another hardware design

| Capability | Existing setup plus software | Gauge + hub upgrade |
| --- | --- | --- |
| USB charging while battery connected | Existing hardware path; physical charging acceptance still needed | Same charger/path retained |
| Manual and automatic battery cutoff | Existing latch; software/physical validation required | Same latch; added gauge standby must be measured |
| Deliberate startup from off | Existing physical WAKE circuit; reported fault unresolved | Gauge does not fix the WAKE circuit |
| Battery percentage/voltage | Not available from the current wiring | Available after firmware and acceptance |
| Low-battery warning and safe start inhibition | No reliable measurement | Feasible with calibrated thresholds |
| Measured charge current | Not available | Not provided by MAX17048 |
| Confirmed charging/full/fault status | Not available | Still not provided by MAX17048 alone |

For **authoritative charging/full/fault telemetry**, the existing charger outputs must be sensed through an appropriately designed finished assembly, or the power/charging architecture replaced with one that exposes that state digitally. No fully verified, no-rewiring, same-battery/Dial drop-in kit meeting that entire requirement was found. That limitation must be explicit; an inferred upward SOC trend is not sold as a complete charging-state solution.

Investigated alternatives:

- [M5Stack TimerPWR U189](https://docs.m5stack.com/en/unit/Unit_TimerPWR): integrated charger, current measurement, buttons and OLED, but moves the cell to a 1.25 mm socket and feeds external 5 V through Grove. It requires a different power-routing/backfeed/shutdown analysis and a different startup button; not a verified Dial drop-in.
- [SparkFun Battery Babysitter](https://learn.sparkfun.com/tutorials/battery-babysitter-hookup-guide/all): charger and BQ27441 gauge, but load and I2C connection are exposed footprints, requiring assembly/wiring; output can reach 5.5 V. Does not meet this user's requirement.
- [Grove LTC2941 coulomb counter](https://wiki.seeedstudio.com/Grove-Coulomb_Counter_3.3V_to_5V-LTC2941/): counts charge but load connection is not a matching finished Dial battery path and full-charge synchronization still needs evidence. Not a complete no-work solution.
- [Soldered BQ24295](https://www.berrybase.de/soldered-bq24295-akku-lademodul-cc-cv-4-35-17v-bis-3a-jst-ph-easyc-qwiiic): another charger, not a drop-in monitor for the existing parallel charging path; listed unavailable. Do not add it alongside the Dial charger.
- Generic power banks, TP4056 modules, M5GO/Core-only battery bases and larger replacement cells do not satisfy the established connector, data/charging-port, gauge and housing requirements automatically.

## Acceptance before procurement is described as plug-and-play

Confirm the existing detachable PH interface and battery-to-gauge polarity, the PaHub revision/upstream voltage, the full cable pin mapping, the no-back-power cutoff state, actual charge behavior and physical fit. Keep the Chain Key on PORT.B. New firmware must select PaHub channel 0 and communicate with 0x36 on the external bus; stock 0.2.14/0.2.16 does not implement it.

The electronic BOM is a documented solderless assembly candidate. Full compatibility, charging status and finished case readiness remain distinct acceptance items. Do not buy extra hardware merely to diagnose the cold-start fault: first establish the existing board's power behavior.
