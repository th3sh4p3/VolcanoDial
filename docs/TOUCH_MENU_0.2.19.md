# Touch menu and clear shutdown state

User request, 4 November 2026: navigate the menu by vertical touch scrolling while retaining the wheel; explain why a cancelled workflow can keep the Dial powered and why the off entry disappeared.

Design: the existing three-row menu supports vertical swipes. Up advances, down goes back; each 36 pixels traverses one available entry, with bounded steps and no momentum. Movement beyond a 12-pixel tap tolerance consumes the gesture, including horizontal movement, so releasing a drag cannot activate a row. Existing taps, rotary selection, boot-release and first-gesture-wakes-only behavior remain.

The off entry stays visible in both menus. If operation, output demand, cooling or an unconfirmed OFF duty prevents shutdown, the selected entry explains the reason. Tapping it while blocked does not submit a cutoff or arm confirmation. When eligible, the existing two-step confirmation and worker-owned safety gate remain mandatory. Cancelling a workflow does not discard its saved cooling duty.

Background cooling/Hue OFF attempts, like background reconnection, must not publish a foreground connecting state that wakes the display. Display sleep and hardware power cutoff remain distinct. The LED reported beneath USB-C is not identified conclusively from its location; current powered cooling supervision explains why a power indicator can remain lit. Measured off-state drain remains unverified.

Validation: gesture thresholds, multiple rows, reversals, horizontal motion, cancellation/multitouch and no activation after drag; visible blocked off rows with preserved power guards; foreground/background publish paths; actual renderer preview; full host suite; pinned target build; app-only installation once the live device is idle and cooling/OFF duties are complete. Preserve stored data and the 0.2.18 HOLD correction.
