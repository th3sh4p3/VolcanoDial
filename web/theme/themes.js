export const DEFAULT_THEME = 'default';
export const THEME_IDS = Object.freeze(['default', '420-overdrive', 'dank-dimension']);

export const JOKES = Object.freeze([
  'All green. Obviously.',
  'Cloud nine: calibrated.',
  'The Volcano has spoken.',
  'Herb your enthusiasm.',
  'High five, airflow!',
  'Perfectly toasted.',
  'Stash saved. Snacks not included.',
  'Workflow rolled and ready.',
]);

const defaultCopy = {
  appTitle: 'Volcano',
  appBadge: '',
  tile: {
    start: 'Start', end: 'End', time: 'Time', steps: 'Steps', previous: 'Previous', next: 'Next',
    run: 'Run', fanTimer: 'Fan Timer', heatOn: 'Heat ON', heatOff: 'Heat OFF', fanOn: 'Fan ON',
    fanOff: 'Fan OFF', temperature: 'Temperature', runtime: 'Runtime', connectSecondary: '',
  },
  editor: {
    title: 'Presets & Workflows', presets: 'Presets', workflows: 'Workflows', advanced: 'Advanced',
    start: 'Start', reachTemperature: 'Reach Temperature', wait: 'Wait', air: 'Run Air',
    heaterOff: 'Heater Off', preset: 'Preset Step', end: 'End', save: 'Save',
  },
};

const overdriveCopy = {
  appTitle: 'Volcano 420 Overdrive',
  appBadge: '☘',
  tile: {
    start: 'Wake & Bake', end: 'Peak Dank', time: 'Puff Time', steps: 'Cloud Steps',
    previous: 'Prev Strain', next: 'Next Strain', run: 'Blaze It', fanTimer: 'Cloud Timer',
    heatOn: 'Bake', heatOff: 'Chill', fanOn: 'Clouds', fanOff: 'No Clouds',
    temperature: 'Dank Temp', runtime: 'High Time', connectSecondary: 'Dank Link',
  },
  editor: {
    title: 'The Stash & Smoke Sessions', presets: 'The Stash', workflows: 'Smoke Sessions',
    advanced: 'Secret Garden', start: 'Spark Up', reachTemperature: 'Get Toasty',
    wait: 'Let It Mellow', air: 'Cloud Time', heaterOff: 'Kill the Heat',
    preset: 'Stash Pick', end: 'Touch Grass', save: 'Save the Stash',
  },
};

const dankCopy = {
  appTitle: 'Volcano: Dank Dimension',
  appBadge: '🛸',
  tile: {
    start: 'Ignite the Nug', end: 'Kush Cruise', time: 'Cloud Portal', steps: 'Joint Journey',
    previous: 'Prev Strain', next: 'Next Strain', run: 'Mission Baked', fanTimer: 'Moon Timer',
    heatOn: 'Bong Thrusters', heatOff: 'Thrusters Cool', fanOn: 'Disco Clouds', fanOff: 'Flower Rest',
    temperature: 'Dank Dimension °C', runtime: 'Space Case Time', connectSecondary: 'UFO Dank Link',
  },
  editor: {
    title: 'Dank Dimension Mission Control', presets: 'Cosmic Stash', workflows: 'Joint Journeys',
    advanced: 'Forbidden Greenhouse', start: 'Ignite the Nug', reachTemperature: 'Enter Kush Cruise',
    wait: 'Orbit & Mellow', air: 'Open Cloud Portal', heaterOff: 'Cool Bong Thrusters',
    preset: 'Stash Jar Stop', end: 'Mission Baked', save: 'Seal the Stash Jar',
  },
};

export const THEMES = Object.freeze({
  default: Object.freeze({
    id: 'default', name: 'Default', copy: defaultCopy,
    colors: Object.freeze({
      background: '#12121f', panel: '#1a1a2e', control: '#24243e', controlHover: '#303052',
      accent: '#4488ff', accentHover: '#6aa0ff', text: '#ffffff', muted: '#888888',
      purple: '#aa88ff', gold: '#ff8844', warning: '#ffaa00', danger: '#ff4444',
      success: '#44ff44', cyan: '#44aaff', border: '#333333', heat: '#ff6644', mutedDark: '#777777',
    }),
  }),
  '420-overdrive': Object.freeze({
    id: '420-overdrive', name: '420 Overdrive', copy: overdriveCopy,
    colors: Object.freeze({
      background: '#07140c', panel: '#0d2114', control: '#173923', controlHover: '#235431',
      accent: '#78ff45', accentHover: '#a2ff79', text: '#efffe9', muted: '#9fbc98',
      purple: '#b76cff', gold: '#d7a84d', warning: '#ffd166', danger: '#ff6b6b',
      success: '#78ff45', cyan: '#b76cff', border: '#2d6840', heat: '#d7a84d', mutedDark: '#789172',
    }),
  }),
  'dank-dimension': Object.freeze({
    id: 'dank-dimension', name: 'Dank Dimension', copy: dankCopy,
    colors: Object.freeze({
      background: '#050209', panel: '#10091d', control: '#1b1031', controlHover: '#2a1550',
      accent: '#70ff00', accentHover: '#a5ff59', text: '#fff8e7', muted: '#c8b9dc',
      purple: '#9b4dff', gold: '#ffd447', warning: '#ffd447', danger: '#ff365d',
      success: '#70ff00', cyan: '#2ef5ff', border: '#7131a8', heat: '#ff2bb5', mutedDark: '#8f7ca7',
    }),
  }),
});

export function isValidTheme(value) {
  return THEME_IDS.includes(value);
}

export function normalizeTheme(value) {
  return isValidTheme(value) ? value : DEFAULT_THEME;
}

export function assertTheme(value) {
  if (!isValidTheme(value)) throw new Error('Invalid appearance theme');
  return value;
}

export function getTheme(value) {
  return THEMES[normalizeTheme(value)];
}

export function jokeAt(index = 0) {
  const safeIndex = Number.isFinite(index) ? Math.abs(Math.trunc(index)) : 0;
  return JOKES[safeIndex % JOKES.length];
}
