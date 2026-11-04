# Three-second shutdown shortcut

User request, 4 November 2026: holding the physical front wheel button for three seconds opens a shutdown question without navigating the menu. The opening hold/release cannot confirm shutdown; a separate touch or fresh click is required. The dialog defaults rotary selection to Cancel. A tap on AUS confirms directly; rotation plus click is also supported.

Keep the existing 700 ms menu/Stop behavior. A continued eligible hold opens the dialog at three seconds, once per press. A press already serving as manual hose AIR hold is excluded, so a normal long air hold cannot open a power dialog. Boot/wake gestures remain consumed until release.

**Latest explicit user override:** confirmed manual shutdown takes priority over an active/cancelled workflow and its cooling duty. It fences/drops queued starts, stops the workflow, requests HEAT/AIR OFF, confirms the configured Hue outlet OFF even while hot, clears fulfilled saved duties and releases HOLD. Cooling does not block this deliberate action. Automatic idle shutdown retains the strict cooling guard. Missing output/outlet OFF proof or failed duty persistence retains power and reports the actual failure; it must not silently claim shutdown.

The shutdown sequence is: stop and confirm outputs OFF (or authoritative owned-plug power removal), configured Hue outlet OFF confirmation, then HOLD release. A complete configured Hue plug is used by default for manual shutdown, independently of automatic-cooling settings; no configured plug skips that step. After confirmed release, worker standby performs no Volcano reconnect/control work. An intentional wake leaves the program stopped and requires new input.

Validation: exact 2,999/3,000 ms threshold, single firing, cancelled/disabled holds and boot/no-new-press behavior; actual long-hold input block and release suppression; dialog geometry/default Cancel/explicit acceptance during cooling; actual worker standby branch and Hue-OFF-before-LOW order; full suite, pinned build and app-only install preserving data. No safety monitoring is disabled to make shutdown appear complete.

The actual manual worker is compiled with transport/storage fakes and checked with active workflows, pending cooling, Hue enabled/autoOff both false, no Hue, failed Hue, failed persistence, failed telemetry, incomplete saved-duty ownership, RTC failure, and quiescence failure. Hardware heating/ON commands are not used for these checks.
