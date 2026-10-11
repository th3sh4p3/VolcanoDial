// BLE UUIDs for S&B devices (Volcano Hybrid / Crafty)
// noble uses UUIDs without dashes, lowercase

// Primary Service UUIDs
export const SERVICE_UUIDS = [
  '1011000053544f525a264249434b454c', // Volcano4 - main control service
];

// All service UUIDs for discovery
export const ALL_SERVICE_UUIDS = [
  '0000000119890108123456789abc',     // Volcano1
  '0100000219890108123456789abc',     // Volcano2
  '1010000053544f525a264249434b454c', // Volcano3
  '1011000053544f525a264249434b454c', // Volcano4
  '1013000053544f525a264249434b454c', // Volcano5
];

// Characteristic UUIDs (Volcano4 service)
export const HEAT_ON_UUID   = '1011000f53544f525a264249434b454c';
export const HEAT_OFF_UUID  = '1011001053544f525a264249434b454c';
export const FAN_ON_UUID    = '1011001353544f525a264249434b454c';
export const FAN_OFF_UUID   = '1011001453544f525a264249434b454c';

export const CURRENT_TEMP_UUID = '1011000153544f525a264249434b454c';
export const TARGET_TEMP_UUID  = '1011000353544f525a264249434b454c';
// Kept as an alias for consumers that used the old write-only name.
export const WRITE_TEMP_UUID   = TARGET_TEMP_UUID;

// Read-only status/diagnostic characteristics from the Volcano status service.
export const BLE_FIRMWARE_UUID = '1010000453544f525a264249434b454c';
export const FIRMWARE_UUID     = '1010000553544f525a264249434b454c';
export const MODEL_UUID        = '1010000753544f525a264249434b454c';
export const PRJSTAT1_UUID     = '1010000c53544f525a264249434b454c';
export const PRJSTAT2_UUID     = '1010000d53544f525a264249434b454c';
export const FAULT_HISTORY_1_UUID = '1010001553544f525a264249434b454c';
export const FAULT_HISTORY_2_UUID = '1010001653544f525a264249434b454c';

// Device name prefixes for scanning (Volcano Hybrid = 'S&B', Crafty = 'STORZ&BICKEL')
export const DEVICE_NAME_PREFIXES = ['S&B', 'STORZ&BICKEL'];

// Temperature limits (Celsius)
export const MIN_TEMP = 40;
export const MAX_TEMP = 230;
export const TEMP_STEP = 10;

// Fill time limits (seconds)
export const MIN_FILL_TIME = 5;
export const MAX_FILL_TIME = 300;

// Steps limits
export const MIN_STEPS = 1;
export const MAX_STEPS = 20;

// Temperature overflow threshold (for reading current temp)
export const TEMP_OVERFLOW_THRESHOLD = 6536;
