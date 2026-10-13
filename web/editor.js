import { insertLinearNode, linearInsertionTargetAtX, moveLinearNode, orderedGraphNodes, rebuildLinearEdges, removeLinearNode } from './editor-model.js';
import { JOKES, getTheme, normalizeTheme } from './theme/themes.js';

const api = window.volcanoLibrary;
const $ = (id) => document.getElementById(id);
const clone = (value) => structuredClone(value);
const PRESET_MIME = 'application/x-volcano-preset';
const NODE_MIME = 'application/x-volcano-node';

let library = null;
let selected = null;
let draft = null;
let selectedNodeId = null;
let libraryFocusKey = null;
let dirty = false;
let locked = false;
let editConnections = false;
let undoStack = [];
let redoStack = [];
let pendingSource = null;
let zoom = 1;
let currentTheme = normalizeTheme(document.documentElement.dataset.theme);
let jokeIndex = 0;

const labels = new Proxy({}, {
  get: (_target, type) => getTheme(currentTheme).copy.editor[type],
});

function status(message, error = false) {
  const isSuccess = !error && /added|moved|reordered|saved|valid|imported|updated|reset|ready/i.test(message);
  const joke = currentTheme !== 'default' && isSuccess ? ` · ${JOKES[jokeIndex++ % JOKES.length]}` : '';
  $('status').textContent = `${message}${joke}`;
  $('status').classList.toggle('error', error);
}

function applyTheme(themeId, announce = false) {
  currentTheme = normalizeTheme(themeId);
  const theme = getTheme(currentTheme);
  document.documentElement.dataset.theme = currentTheme;
  document.title = `Volcano ${theme.copy.editor.title}`;
  $('editor-theme-title').textContent = theme.copy.editor.title;
  $('editor-leaf').textContent = theme.copy.appBadge;
  $('save-btn').textContent = theme.copy.editor.save;
  if (announce && currentTheme !== 'default') status(JOKES[jokeIndex++ % JOKES.length]);
  if (library) renderAll();
}

function clearErrors() {
  $('error-summary').hidden = true;
  $('error-summary').replaceChildren();
}

function showErrors(errors, focus = false) {
  const summary = $('error-summary');
  summary.replaceChildren();
  const title = document.createElement('strong');
  title.textContent = errors.length === 1 ? 'Please fix this before saving:' : 'Please fix these issues before saving:';
  const list = document.createElement('ul');
  for (const error of errors) { const item = document.createElement('li'); item.textContent = error; list.appendChild(item); }
  summary.append(title, list); summary.hidden = false;
  if (focus) requestAnimationFrame(() => summary.focus());
}

function setDirty(value = true) {
  dirty = value;
  $('dirty-indicator').textContent = dirty ? 'Unsaved changes' : '';
  $('save-btn').disabled = locked || !draft || !dirty;
}

function record() {
  if (!draft) return;
  undoStack.push(clone(draft));
  if (undoStack.length > 50) undoStack.shift();
  redoStack = [];
  setDirty(true);
}

function focusKeyOfActiveElement() { return document.activeElement?.dataset?.focusKey || null; }
function focusAfterRender(key) {
  if (!key) return;
  const restore = () => document.querySelector(`[data-focus-key="${CSS.escape(key)}"]`)?.focus();
  restore(); requestAnimationFrame(restore);
}

function mutate(change, rerender = true, focusKey = null) {
  if (locked || !draft) return;
  record(); change(); clearErrors();
  if (rerender) { renderAll(); focusAfterRender(focusKey); }
  else { setDirty(true); updateButtons(); }
}

function findEntity(kind, id) {
  const collection = kind === 'workflow' ? library.workflows : kind === 'variable' ? library.globalVariables : library.presets;
  return collection.find((item) => item.id === id) || null;
}

function kindForPreset(preset) { return preset.kind === 'advanced' ? 'advanced' : 'simple'; }
function entityKey(kind, id) { return `${kind}:${id}`; }

function expressionUses(value, name) {
  let count = 0;
  const visit = (item) => {
    if (!item || typeof item !== 'object') return;
    for (const [key, child] of Object.entries(item)) {
      if (key === 'expression' && typeof child === 'string') count += (child.match(new RegExp(`\\b${name}\\b`, 'g')) || []).length;
      else visit(child);
    }
  };
  visit(value); return count;
}

function libraryEntries() {
  return [
    ...library.presets.map((item) => ['preset', item, item.kind === 'advanced' ? 'ADV' : 'PRE']),
    ...library.workflows.map((item) => ['workflow', item, 'FLOW']),
    ...library.globalVariables.map((item) => ['variable', item, 'VAR']),
  ];
}

function renderLibraryItem(container, kind, item, badge) {
  const key = entityKey(kind, item.id);
  const row = document.createElement('div');
  row.className = `library-item${selected?.kind === kind && selected.id === item.id ? ' selected' : ''}`;
  row.dataset.kind = kind; row.dataset.id = item.id; row.dataset.focusKey = `library-${key}`;
  row.tabIndex = key === libraryFocusKey ? 0 : -1;
  row.setAttribute('role', 'option');
  row.setAttribute('aria-selected', String(selected?.kind === kind && selected.id === item.id));
  row.draggable = Boolean(kind === 'preset' && selected?.kind === 'workflow' && draft?.graph && !locked);
  row.title = row.draggable ? 'Drag into the workflow to add this preset' : item.name;
  const badgeEl = document.createElement('span'); badgeEl.className = 'badge'; badgeEl.textContent = badge;
  const name = document.createElement('span'); name.className = 'name'; name.textContent = item.name;
  row.append(badgeEl, name);
  row.addEventListener('click', () => selectEntity(kind, item.id, false, `library-${key}`));
  row.addEventListener('keydown', handleLibraryKeydown);
  row.addEventListener('dragstart', (event) => {
    if (!row.draggable) { event.preventDefault(); return; }
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData(PRESET_MIME, item.id);
    event.dataTransfer.setData('text/plain', item.id);
    row.classList.add('dragging'); document.body.classList.add('drag-active');
    status(`Drag ${item.name} to a workflow position.`);
  });
  row.addEventListener('dragend', () => { row.classList.remove('dragging'); clearDragState(); });
  container.appendChild(row);
}

function handleLibraryKeydown(event) {
  const rows = [...document.querySelectorAll('.library-item')];
  const index = rows.indexOf(event.currentTarget);
  let target = null;
  if (event.key === 'ArrowDown') target = rows[index + 1] || rows[0];
  else if (event.key === 'ArrowUp') target = rows[index - 1] || rows.at(-1);
  else if (event.key === 'Home') target = rows[0];
  else if (event.key === 'End') target = rows.at(-1);
  else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault(); selectEntity(event.currentTarget.dataset.kind, event.currentTarget.dataset.id, false, event.currentTarget.dataset.focusKey); return;
  } else if (event.key === 'Delete' && event.currentTarget.getAttribute('aria-selected') === 'true') {
    event.preventDefault(); removeEntity(); return;
  }
  if (!target) return;
  event.preventDefault(); rows.forEach((row) => { row.tabIndex = -1; }); target.tabIndex = 0;
  libraryFocusKey = entityKey(target.dataset.kind, target.dataset.id); target.focus();
}

function renderLibrary() {
  const query = $('search').value.trim().toLowerCase();
  const entries = libraryEntries().filter(([, item]) => item.name.toLowerCase().includes(query));
  const visibleKeys = entries.map(([kind, item]) => entityKey(kind, item.id));
  const selectedKey = selected ? entityKey(selected.kind, selected.id) : null;
  if (!visibleKeys.includes(libraryFocusKey)) libraryFocusKey = visibleKeys.includes(selectedKey) ? selectedKey : visibleKeys[0] || null;

  const list = $('library-list'); list.replaceChildren();
  const addGroup = (title, items) => {
    if (!items.length) return;
    const group = document.createElement('section'); group.className = 'library-group';
    const heading = document.createElement('h3'); heading.textContent = title; group.appendChild(heading);
    for (const entry of items) renderLibraryItem(group, ...entry);
    list.appendChild(group);
  };
  const copy = getTheme(currentTheme).copy.editor;
  addGroup(copy.presets, entries.filter(([kind]) => kind === 'preset'));
  addGroup(copy.workflows, entries.filter(([kind]) => kind === 'workflow'));
  const variables = entries.filter(([kind]) => kind === 'variable');
  if (variables.length) {
    const advanced = document.createElement('details'); advanced.className = 'library-advanced';
    advanced.open = Boolean(query || selected?.kind === 'variable');
    const summary = document.createElement('summary'); summary.textContent = copy.advanced; advanced.appendChild(summary);
    for (const entry of variables) renderLibraryItem(advanced, ...entry);
    list.appendChild(advanced);
  }
  if (!entries.length) { const empty = document.createElement('div'); empty.className = 'library-empty'; empty.textContent = 'No matching items.'; list.appendChild(empty); }
}

function selectEntity(kind, id, force = false, focusKey = null) {
  if (!force && dirty && !window.confirm('Discard unsaved changes?')) return;
  const entity = findEntity(kind, id); if (!entity) return;
  selected = { kind, id }; draft = clone(entity); selectedNodeId = null; pendingSource = null; editConnections = false;
  libraryFocusKey = entityKey(kind, id); undoStack = []; redoStack = []; clearErrors(); setDirty(false); renderAll(); focusAfterRender(focusKey);
}

function renderEntityHeader() {
  $('entity-header').hidden = !draft;
  if (!draft) return;
  const input = $('entity-name');
  if (document.activeElement !== input) input.value = draft.name;
  input.disabled = locked;
  $('entity-kind').textContent = selected.kind === 'preset' ? `${kindForPreset(draft)} preset` : selected.kind === 'variable' ? 'global variable' : 'workflow';
}

function renderAll() {
  if (!library) return;
  renderLibrary(); renderEntityHeader();
  $('empty-editor').hidden = Boolean(draft);
  $('canvas-viewport').hidden = !draft || selected.kind === 'variable' || draft.kind === 'simple';
  $('simple-editor').hidden = !draft || (selected.kind !== 'variable' && draft.kind !== 'simple');
  $('palette').replaceChildren(); $('inspector').replaceChildren();
  $('variables-section').hidden = !draft || draft.kind !== 'advanced';
  if (!draft) { $('simple-editor').replaceChildren(); $('node-layer').replaceChildren(); $('drop-layer').replaceChildren(); updateButtons(); return; }
  if (selected.kind === 'variable') { renderGlobalVariable(); renderInspector(); }
  else if (draft.kind === 'simple') { renderSimple(); renderInspector(); }
  else { renderPalette(); renderGraph(); renderInspector(); renderVariables(); }
  updateButtons();
}

function updateButtons() {
  const mutable = Boolean(draft) && !locked;
  $('new-btn').disabled = locked;
  $('entity-menu-btn').hidden = !draft; $('entity-menu-btn').disabled = !draft;
  $('duplicate-btn').disabled = !mutable; $('delete-btn').disabled = !mutable;
  const order = library?.runnableOrder || [];
  const index = selected ? order.findIndex((ref) => ref.kind === selected.kind && ref.id === selected.id) : -1;
  $('move-up-btn').disabled = !mutable || selected?.kind === 'variable' || index <= 0;
  $('move-down-btn').disabled = !mutable || selected?.kind === 'variable' || index < 0 || index >= order.length - 1;
  $('convert-btn').hidden = selected?.kind !== 'preset' || draft?.kind !== 'simple';
  $('convert-btn').disabled = !mutable || $('convert-btn').hidden;
  $('layout-btn').disabled = !mutable || !draft?.graph;
  $('validate-btn').disabled = !draft || selected?.kind === 'variable';
  $('distribute-btn').hidden = draft?.kind !== 'advanced'; $('distribute-btn').disabled = !mutable || $('distribute-btn').hidden;
  $('edit-connections-btn').disabled = !mutable || !draft?.graph;
  $('edit-connections-btn').setAttribute('aria-checked', String(editConnections));
  $('import-btn').disabled = locked; $('export-btn').disabled = !library;
  $('undo-btn').disabled = locked || !undoStack.length; $('redo-btn').disabled = locked || !redoStack.length;
  $('save-btn').disabled = locked || !draft || !dirty;
  $('add-variable-btn').disabled = !mutable;
}

function labeledInput(container, label, value, onChange, options = {}) {
  const wrapper = document.createElement('div'); wrapper.className = 'field';
  const id = `field-${options.key}`;
  const labelEl = document.createElement('label'); labelEl.textContent = label; labelEl.htmlFor = id;
  const input = document.createElement('input'); input.id = id; input.dataset.focusKey = options.key;
  input.type = options.type || 'text'; input.value = value ?? ''; input.disabled = locked;
  if (options.min != null) input.min = options.min; if (options.max != null) input.max = options.max; if (options.step != null) input.step = options.step;
  input.addEventListener('change', () => onChange(options.type === 'number' ? Number(input.value) : input.value, input));
  wrapper.append(labelEl, input); container.appendChild(wrapper); return input;
}

function labeledSelect(container, label, values, current, onChange, key) {
  const wrapper = document.createElement('div'); wrapper.className = 'field'; const id = `field-${key}`;
  const labelEl = document.createElement('label'); labelEl.textContent = label; labelEl.htmlFor = id;
  const select = document.createElement('select'); select.id = id; select.dataset.focusKey = key; select.disabled = locked;
  for (const [text, value] of values) select.add(new Option(text, value)); select.value = current;
  select.addEventListener('change', () => onChange(select.value, select)); wrapper.append(labelEl, select); container.appendChild(wrapper); return select;
}

function renderSimple() {
  const panel = $('simple-editor'); panel.replaceChildren();
  const grid = document.createElement('div'); grid.className = 'form-grid'; panel.appendChild(grid);
  labeledInput(grid, 'Start temperature (°C)', draft.startTemp, (value) => mutate(() => { draft.startTemp = value; }, false), { key: 'simple-start', type: 'number', min: 40, max: 230 });
  labeledInput(grid, 'End temperature (°C)', draft.endTemp, (value) => mutate(() => { draft.endTemp = value; }, false), { key: 'simple-end', type: 'number', min: 40, max: 230 });
  labeledInput(grid, 'Total air time (seconds)', draft.fillTime, (value) => mutate(() => { draft.fillTime = value; }, false), { key: 'simple-time', type: 'number', min: 5, max: 300 });
  labeledInput(grid, 'Temperature steps', draft.steps, (value) => mutate(() => { draft.steps = value; }, false), { key: 'simple-steps', type: 'number', min: 1, max: 20 });
  const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'This preset stays adjustable from the main controller. Use the item menu to create a separate advanced copy.'; panel.appendChild(hint);
}

function defaultValueForType(valueType) { return valueType === 'temperature' ? 170 : valueType === 'duration' ? 30 : 1; }

function bindingEditor(container, title, binding, expectedType, setBinding, key) {
  if (binding?.mode === 'expression') {
    const details = document.createElement('details'); details.className = 'advanced-block'; details.open = true;
    const summary = document.createElement('summary'); summary.textContent = `${title} · Formula`; details.appendChild(summary);
    labeledInput(details, 'Expression', binding.expression, (value) => { mutate(() => setBinding({ mode: 'expression', expression: value }), false); updateSelectedNodeSummary(); }, { key: `${key}-expression` });
    const literal = document.createElement('button'); literal.textContent = 'Use a number instead'; literal.disabled = locked;
    literal.addEventListener('click', () => mutate(() => setBinding({ mode: 'literal', value: defaultValueForType(expectedType) }), true, `${key}-value`));
    const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = `${expectedType}; supports variables, + − × ÷ and parentheses.`;
    details.append(literal, hint); container.appendChild(details); return;
  }
  labeledInput(container, title, binding?.value ?? defaultValueForType(expectedType), (value) => { mutate(() => setBinding({ mode: 'literal', value }), false); updateSelectedNodeSummary(); }, { key: `${key}-value`, type: 'number' });
  const details = document.createElement('details'); details.className = 'advanced-block';
  const summary = document.createElement('summary'); summary.textContent = 'Advanced formula';
  const formula = document.createElement('button'); formula.textContent = 'Use a formula instead'; formula.disabled = locked;
  formula.addEventListener('click', () => mutate(() => setBinding({ mode: 'expression', expression: '' }), true, `${key}-expression`));
  const hint = document.createElement('div'); hint.className = 'hint'; hint.textContent = 'Reference global or local variables with safe arithmetic.';
  details.append(summary, formula, hint); container.appendChild(details);
}

function renderGlobalVariable() {
  const panel = $('simple-editor'); panel.replaceChildren();
  const type = labeledSelect(panel, 'Value type', [['Scalar', 'scalar'], ['Duration', 'duration'], ['Temperature', 'temperature']], draft.valueType, (value) => {
    mutate(() => { draft.valueType = value; }, false);
  }, 'global-type');
  bindingEditor(panel, 'Value', draft.binding, type.value, (binding) => { draft.binding = binding; }, 'global-binding');
  const users = library.presets.filter((preset) => expressionUses(preset, draft.name)).map(({ name }) => name);
  const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = `Available to every advanced preset. Used by: ${users.length ? users.join(', ') : 'none'}.`; panel.appendChild(hint);
}

function graphOrder() {
  return draft?.graph ? orderedGraphNodes(draft.graph) : [];
}

function applyLayout(order = graphOrder()) { order.forEach((item, index) => { item.position = { x: 60 + index * 230, y: 190 }; }); }
function rebuildEdges(order) { rebuildLinearEdges(draft.graph, order); }

function defaultNode(type, presetId = null) {
  const item = { id: crypto.randomUUID(), type, position: { x: 400, y: 190 } };
  if (type === 'reachTemperature') item.config = { temperature: { mode: 'literal', value: 170 }, timeout: { mode: 'literal', value: 360 } };
  if (type === 'wait') item.config = { duration: { mode: 'literal', value: 2 } };
  if (type === 'air') item.config = { duration: { mode: 'literal', value: 30 } };
  if (type === 'confirmBalloon') item.config = { timeout: { mode: 'literal', value: 120 } };
  if (type === 'preset') item.config = { presetId: presetId || library.presets[0]?.id };
  return item;
}

function insertNodeBefore(type, beforeId, presetId = null) {
  if (locked || !draft?.graph) return;
  if (type === 'preset' && (selected.kind !== 'workflow' || !library.presets.some(({ id }) => id === presetId))) { status('Choose a valid preset first.', true); return; }
  const item = defaultNode(type, presetId);
  mutate(() => {
    const order = insertLinearNode(draft.graph, item, beforeId); applyLayout(order); selectedNodeId = item.id;
  }, true, `node:${item.id}`);
  status(type === 'preset' ? 'Preset added to workflow.' : `${labels[type]} added.`);
}

function addNode(type, presetId = null) {
  const order = graphOrder(); const selectedIndex = order.findIndex(({ id }) => id === selectedNodeId);
  const before = selectedIndex >= 0 && selectedIndex < order.length - 1 ? order[selectedIndex + 1] : order.find(({ type: nodeType }) => nodeType === 'end');
  insertNodeBefore(type, before?.id, presetId);
}

function moveNodeBefore(nodeId, beforeId) {
  const order = graphOrder(); const node = order.find(({ id }) => id === nodeId);
  if (!node || ['start', 'end'].includes(node.type) || nodeId === beforeId) return;
  const remaining = order.filter(({ id }) => id !== nodeId); const target = remaining.findIndex(({ id }) => id === beforeId);
  if (target < 1) return; remaining.splice(target, 0, node);
  if (remaining.every((item, index) => item.id === order[index].id)) return;
  mutate(() => { const result = moveLinearNode(draft.graph, nodeId, beforeId); applyLayout(result.order); selectedNodeId = nodeId; }, true, `node:${nodeId}`);
  status(`${labels[node.type]} moved.`);
}

function makePaletteMenu(label, items) {
  const wrap = document.createElement('div'); wrap.className = 'menu-wrap';
  const trigger = document.createElement('button'); trigger.textContent = label; trigger.disabled = locked || !items.length; trigger.setAttribute('aria-haspopup', 'menu'); trigger.setAttribute('aria-expanded', 'false');
  const menu = document.createElement('div'); menu.className = 'menu align-left'; menu.setAttribute('role', 'menu'); menu.hidden = true;
  for (const [text, action] of items) { const button = document.createElement('button'); button.textContent = text; button.setAttribute('role', 'menuitem'); button.addEventListener('click', action); menu.appendChild(button); }
  wrap.append(trigger, menu); attachMenu(trigger, menu); $('palette').appendChild(wrap);
}

function renderPalette() {
  const palette = $('palette'); palette.replaceChildren();
  if (selected.kind === 'workflow') {
    makePaletteMenu('Add preset', library.presets.map((preset) => [`${preset.name} · ${kindForPreset(preset)}`, () => addNode('preset', preset.id)]));
    const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = 'Or drag any preset from the library into the sequence.'; palette.appendChild(hint);
  } else {
    makePaletteMenu('Add action', [
      [labels.reachTemperature, () => addNode('reachTemperature')], [labels.wait, () => addNode('wait')],
      [labels.air, () => addNode('air')], [labels.confirmBalloon, () => addNode('confirmBalloon')], [labels.heaterOff, () => addNode('heaterOff')],
    ]);
    const hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = 'Select a step to insert after it. Drag steps or use Earlier/Later to reorder.'; palette.appendChild(hint);
  }
}

function nodeSummary(item) {
  const binding = (value, suffix) => value?.mode === 'expression' ? value.expression : `${value?.value ?? '--'}${suffix}`;
  if (item.type === 'reachTemperature') return binding(item.config?.temperature, '°C');
  if (item.type === 'wait' || item.type === 'air') return binding(item.config?.duration, 's');
  if (item.type === 'confirmBalloon') return `Confirm within ${binding(item.config?.timeout, 's')}`;
  if (item.type === 'preset') return library.presets.find(({ id }) => id === item.config?.presetId)?.name || 'Missing preset';
  if (item.type === 'start') return 'Execution begins'; if (item.type === 'end') return 'Outputs safely off'; return 'Turn heater off';
}

function updateSelectedNodeSummary() {
  if (!selectedNodeId) return;
  const item = draft?.graph?.nodes.find(({ id }) => id === selectedNodeId);
  const summary = document.querySelector(`.graph-node[data-id="${CSS.escape(selectedNodeId)}"] .node-summary`);
  if (item && summary) summary.textContent = nodeSummary(item);
}

function selectNode(id, focus = false) {
  selectedNodeId = id; renderGraph(); renderInspector(); if (focus) focusAfterRender(`node:${id}`);
}

function handleNodeKeydown(event, item, order) {
  const index = order.findIndex(({ id }) => id === item.id); let target = null;
  if (event.key === 'ArrowRight') target = order[index + 1] || order[0];
  else if (event.key === 'ArrowLeft') target = order[index - 1] || order.at(-1);
  else if (event.key === 'Home') target = order[0];
  else if (event.key === 'End') target = order.at(-1);
  else if ((event.key === 'Enter' || event.key === ' ') && selectedNodeId !== item.id) { event.preventDefault(); selectNode(item.id, true); return; }
  else if (event.key === 'Delete') { event.preventDefault(); selectedNodeId = item.id; removeSelectedNode(); return; }
  else if (event.altKey && event.key === 'ArrowLeft') { event.preventDefault(); selectedNodeId = item.id; moveNode(-1); return; }
  else if (event.altKey && event.key === 'ArrowRight') { event.preventDefault(); selectedNodeId = item.id; moveNode(1); return; }
  if (target) { event.preventDefault(); selectNode(target.id, true); }
}

function renderGraph() {
  const layer = $('node-layer'); const drops = $('drop-layer'); layer.replaceChildren(); drops.replaceChildren();
  const order = graphOrder(); if (!editConnections) applyLayout(order);
  const requiredWidth = Math.max(1500, ...draft.graph.nodes.map((item) => (item.position?.x || 0) + 320));
  const requiredHeight = Math.max(750, ...draft.graph.nodes.map((item) => (item.position?.y || 0) + 220));
  $('canvas').style.width = `${requiredWidth}px`; $('canvas').style.height = `${requiredHeight}px`;
  const rovingId = selectedNodeId || order[0]?.id;
  for (const item of order) {
    const el = document.createElement('div'); el.className = `graph-node${item.id === selectedNodeId ? ' selected' : ''}`; el.dataset.id = item.id; el.dataset.focusKey = `node:${item.id}`;
    el.style.left = `${item.position?.x || 0}px`; el.style.top = `${item.position?.y || 0}px`; el.tabIndex = item.id === rovingId ? 0 : -1;
    el.setAttribute('role', 'option'); el.setAttribute('aria-selected', String(item.id === selectedNodeId)); el.setAttribute('aria-label', `${labels[item.type] || item.type}: ${nodeSummary(item)}`);
    const title = document.createElement('div'); title.className = 'node-title'; title.textContent = labels[item.type] || item.type;
    const summary = document.createElement('div'); summary.className = 'node-summary'; summary.textContent = nodeSummary(item); el.append(title, summary);
    const movable = !locked && !['start', 'end'].includes(item.type);
    if (!editConnections && movable) {
      el.draggable = true;
      el.addEventListener('dragstart', (event) => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData(NODE_MIME, item.id); document.body.classList.add('drag-active'); });
      el.addEventListener('dragend', clearDragState);
    }
    if (editConnections) {
      if (item.type !== 'start') { const input = document.createElement('button'); input.className = 'port in'; input.title = 'Connect to this input'; input.setAttribute('aria-label', `Connect to ${labels[item.type]}`); input.addEventListener('click', (event) => { event.stopPropagation(); completeConnection(item.id); }); el.appendChild(input); }
      if (item.type !== 'end') { const output = document.createElement('button'); output.className = `port out${pendingSource === item.id ? ' armed' : ''}`; output.title = 'Start connection'; output.setAttribute('aria-label', `Connect from ${labels[item.type]}`); output.addEventListener('click', (event) => { event.stopPropagation(); pendingSource = pendingSource === item.id ? null : item.id; renderGraph(); focusAfterRender(`node:${item.id}`); }); el.appendChild(output); }
      el.addEventListener('pointerdown', (event) => beginFreeDrag(event, item));
    }
    el.addEventListener('click', () => selectNode(item.id, true));
    el.addEventListener('keydown', (event) => handleNodeKeydown(event, item, order)); layer.appendChild(el);
  }
  if (!editConnections) renderDropTargets(order);
  requestAnimationFrame(renderEdges);
}

function renderDropTargets(order) {
  const layer = $('drop-layer');
  for (let index = 1; index < order.length; index += 1) {
    const previous = order[index - 1]; const target = order[index];
    const drop = document.createElement('div'); drop.className = 'drop-target'; drop.dataset.before = target.id;
    drop.style.left = `${((previous.position?.x || 0) + 180 + (target.position?.x || 0)) / 2 - 25}px`; drop.style.top = `${target.position?.y || 0}px`;
    drop.addEventListener('dragover', (event) => { if (canAcceptDrag(event.dataTransfer)) { event.preventDefault(); event.dataTransfer.dropEffect = [...event.dataTransfer.types].includes(PRESET_MIME) ? 'copy' : 'move'; drop.classList.add('over'); } });
    drop.addEventListener('dragleave', () => drop.classList.remove('over'));
    drop.addEventListener('drop', (event) => { event.preventDefault(); event.stopPropagation(); acceptDrop(event.dataTransfer, target.id); clearDragState(); });
    layer.appendChild(drop);
  }
}

function canAcceptDrag(dataTransfer) {
  if (locked || editConnections || !draft?.graph) return false;
  const types = [...dataTransfer.types];
  if (types.includes(PRESET_MIME)) return selected?.kind === 'workflow';
  return types.includes(NODE_MIME);
}

function acceptDrop(dataTransfer, beforeId) {
  const presetId = dataTransfer.getData(PRESET_MIME);
  if (presetId) { insertNodeBefore('preset', beforeId, presetId); return; }
  const nodeId = dataTransfer.getData(NODE_MIME); if (nodeId) moveNodeBefore(nodeId, beforeId);
}

function dropTargetAtClientX(clientX) {
  const canvasRect = $('canvas').getBoundingClientRect();
  return linearInsertionTargetAtX(draft.graph, (clientX - canvasRect.left) / zoom);
}

function highlightDropTarget(beforeId) {
  document.querySelectorAll('.drop-target').forEach((item) => item.classList.toggle('over', item.dataset.before === beforeId));
}

function clearDragState() {
  document.body.classList.remove('drag-active'); document.querySelectorAll('.drop-target.over').forEach((item) => item.classList.remove('over'));
}

function renderEdges() {
  const svg = $('edge-layer'); svg.replaceChildren(); const canvasRect = $('canvas').getBoundingClientRect();
  for (const edge of draft.graph.edges) {
    const source = document.querySelector(`.graph-node[data-id="${CSS.escape(edge.source)}"]`); const target = document.querySelector(`.graph-node[data-id="${CSS.escape(edge.target)}"]`); if (!source || !target) continue;
    const a = source.getBoundingClientRect(); const b = target.getBoundingClientRect(); const x1 = (a.right - canvasRect.left) / zoom; const y1 = (a.top + a.height / 2 - canvasRect.top) / zoom; const x2 = (b.left - canvasRect.left) / zoom; const y2 = (b.top + b.height / 2 - canvasRect.top) / zoom;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('class', 'edge'); path.setAttribute('d', `M ${x1} ${y1} C ${x1 + 65} ${y1}, ${x2 - 65} ${y2}, ${x2} ${y2}`); svg.appendChild(path);
    const sourceNode = draft.graph.nodes.find((item) => item.id === edge.source); const targetNode = draft.graph.nodes.find((item) => item.id === edge.target);
    if (selected.kind === 'workflow' && sourceNode?.type === 'preset' && targetNode?.type === 'preset') {
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text'); text.setAttribute('x', (x1 + x2) / 2); text.setAttribute('y', (y1 + y2) / 2 - 8); text.setAttribute('fill', '#d6a932'); text.setAttribute('font-size', '10'); text.setAttribute('text-anchor', 'middle'); text.textContent = 'PLAY TO CONTINUE'; svg.appendChild(text);
    }
  }
}

function beginFreeDrag(event, item) {
  if (locked || event.target.classList.contains('port')) return;
  event.preventDefault(); selectedNodeId = item.id; const startX = event.clientX; const startY = event.clientY; const origin = { ...item.position }; const before = clone(draft); let moved = false;
  const move = (moveEvent) => { if (!moved && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) > 2) { moved = true; undoStack.push(before); redoStack = []; } if (!moved) return; item.position.x = Math.max(0, origin.x + (moveEvent.clientX - startX) / zoom); item.position.y = Math.max(0, origin.y + (moveEvent.clientY - startY) / zoom); const el = document.querySelector(`.graph-node[data-id="${CSS.escape(item.id)}"]`); el.style.left = `${item.position.x}px`; el.style.top = `${item.position.y}px`; renderEdges(); };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); if (moved) setDirty(true); renderInspector(); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true });
}

function completeConnection(targetId) {
  if (!pendingSource || pendingSource === targetId || locked) return;
  mutate(() => { draft.graph.edges = draft.graph.edges.filter((edge) => edge.source !== pendingSource && edge.target !== targetId); draft.graph.edges.push({ id: crypto.randomUUID(), source: pendingSource, target: targetId }); pendingSource = null; }, true, `node:${targetId}`);
}

function renderInspector() {
  const panel = $('inspector'); panel.replaceChildren(); if (!draft) return;
  if (draft.kind === 'simple') { const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Quick presets expose only the settings used by the main controller.'; panel.appendChild(hint); return; }
  if (selected.kind === 'variable') { const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Use this named value in advanced preset formulas.'; panel.appendChild(hint); return; }
  if (selected.kind === 'workflow') {
    const advanced = document.createElement('details'); advanced.className = 'advanced-section'; advanced.open = draft.fillTimeSource === 'ui';
    const summary = document.createElement('summary'); summary.textContent = 'Advanced · Air time override'; advanced.appendChild(summary); renderWorkflowFillTime(advanced); panel.appendChild(advanced);
  }
  const item = draft.graph.nodes.find(({ id }) => id === selectedNodeId);
  if (!item) { const hint = document.createElement('p'); hint.className = 'hint'; hint.textContent = 'Select a sequence step to edit it. Use Left/Right to move through steps and Alt+Left/Right to reorder.'; panel.appendChild(hint); return; }
  const title = document.createElement('h3'); title.textContent = labels[item.type] || item.type; panel.appendChild(title);
  if (item.type === 'reachTemperature') {
    bindingEditor(panel, 'Target temperature (°C)', item.config.temperature, 'temperature', (binding) => { item.config.temperature = binding; }, `node-${item.id}-temperature`);
    bindingEditor(panel, 'Maximum wait (seconds)', item.config.timeout, 'duration', (binding) => { item.config.timeout = binding; }, `node-${item.id}-timeout`);
  } else if (item.type === 'wait' || item.type === 'air') {
    bindingEditor(panel, 'Duration (seconds)', item.config.duration, 'duration', (binding) => { item.config.duration = binding; }, `node-${item.id}-duration`);
  } else if (item.type === 'confirmBalloon') {
    bindingEditor(panel, 'Confirmation timeout (seconds)', item.config.timeout, 'duration', (binding) => { item.config.timeout = binding; }, `node-${item.id}-timeout`);
  } else if (item.type === 'preset') {
    labeledSelect(panel, 'Referenced preset', library.presets.map((preset) => [`${preset.name} · ${kindForPreset(preset)}`, preset.id]), item.config.presetId, (value) => { mutate(() => { item.config.presetId = value; }, false); updateSelectedNodeSummary(); }, `node-${item.id}-preset`);
  }
  if (!['start', 'end'].includes(item.type)) {
    const actions = document.createElement('div'); actions.className = 'inspector-actions';
    for (const [text, delta] of [['← Earlier', -1], ['Later →', 1]]) { const button = document.createElement('button'); button.textContent = text; button.disabled = locked; button.addEventListener('click', () => moveNode(delta)); actions.appendChild(button); }
    const remove = document.createElement('button'); remove.textContent = 'Remove'; remove.className = 'danger'; remove.disabled = locked; remove.addEventListener('click', removeSelectedNode); actions.appendChild(remove); panel.appendChild(actions);
  }
}

function renderWorkflowFillTime(panel) {
  const source = labeledSelect(panel, 'Air time source', [['Use each preset', 'presets'], ['Controller override', 'ui']], draft.fillTimeSource || 'presets', (value) => {
    mutate(() => { draft.fillTimeSource = value; }, false); input.disabled = locked || value !== 'ui'; setHint(value);
  }, 'workflow-fill-source');
  const input = labeledInput(panel, 'Air time per preset (seconds)', draft.fillTime ?? 55, (value) => mutate(() => { draft.fillTime = value; }, false), { key: 'workflow-fill-time', type: 'number', min: 5, max: 300 });
  input.disabled = locked || source.value !== 'ui';
  const hint = document.createElement('div'); hint.className = 'hint'; panel.appendChild(hint);
  const setHint = (value) => { hint.textContent = value === 'ui' ? 'The main controller Time buttons override every preset in this workflow without modifying those presets.' : 'Every referenced preset keeps its own air duration.'; };
  setHint(source.value);
}

function moveNode(delta) {
  const order = graphOrder(); const index = order.findIndex(({ id }) => id === selectedNodeId); const target = index + delta;
  if (index <= 0 || index >= order.length - 1 || target <= 0 || target >= order.length - 1) return;
  mutate(() => { [order[index], order[target]] = [order[target], order[index]]; rebuildEdges(order); applyLayout(order); }, true, `node:${selectedNodeId}`);
  status('Step reordered.');
}

function removeSelectedNode() {
  const order = graphOrder(); const index = order.findIndex(({ id }) => id === selectedNodeId); const item = order[index]; if (!item || ['start', 'end'].includes(item.type)) return;
  const nextFocusId = order[index + 1]?.id || order[index - 1]?.id;
  mutate(() => { const result = removeLinearNode(draft.graph, item.id); applyLayout(result.order); selectedNodeId = result.focusId; }, true, `node:${nextFocusId}`);
  status(`${labels[item.type]} removed.`);
}

function resetLayout() { if (!draft?.graph) return; mutate(() => applyLayout(), true, selectedNodeId ? `node:${selectedNodeId}` : null); status('Layout reset.'); }
function setZoom(value) { zoom = Math.max(0.4, Math.min(1.5, value)); $('canvas').style.zoom = zoom; requestAnimationFrame(renderEdges); status(`Zoom ${Math.round(zoom * 100)}%.`); }
function fitGraph() {
  if (!draft?.graph?.nodes.length) return;
  const maxX = Math.max(...draft.graph.nodes.map((item) => (item.position?.x || 0) + 210)); const maxY = Math.max(...draft.graph.nodes.map((item) => (item.position?.y || 0) + 130));
  setZoom(Math.min(1, ($('canvas-viewport').clientWidth - 30) / maxX, ($('canvas-viewport').clientHeight - 30) / maxY)); $('canvas-viewport').scrollTo({ left: 0, top: 0, behavior: 'smooth' });
}

function renderVariables() {
  const section = $('variables-section'); section.open = Boolean((draft.variables || []).some((variable) => variable.binding?.mode === 'expression')) || section.open;
  const list = $('variables-list'); list.replaceChildren();
  for (const variable of draft.variables || []) {
    const card = document.createElement('div'); card.className = 'variable-card'; const row = document.createElement('div'); row.className = 'row';
    const name = document.createElement('input'); name.value = variable.name; name.disabled = locked; name.setAttribute('aria-label', 'Variable name'); name.dataset.focusKey = `variable-${variable.id}-name`;
    name.addEventListener('change', () => { const value = name.value.replace(/[^A-Za-z0-9_]/g, ''); name.value = value; mutate(() => { variable.name = value; }, false); });
    const type = document.createElement('select'); type.disabled = locked; type.setAttribute('aria-label', 'Variable type'); type.dataset.focusKey = `variable-${variable.id}-type`;
    for (const value of ['scalar', 'duration', 'temperature']) type.add(new Option(value, value)); type.value = variable.valueType; type.addEventListener('change', () => mutate(() => { variable.valueType = type.value; }, false));
    const remove = document.createElement('button'); remove.textContent = '×'; remove.title = 'Remove variable'; remove.setAttribute('aria-label', `Remove ${variable.name}`); remove.disabled = locked;
    remove.addEventListener('click', () => mutate(() => { draft.variables = draft.variables.filter(({ id }) => id !== variable.id); }, true, 'add-variable-btn'));
    row.append(name, type, remove); card.appendChild(row);
    bindingEditor(card, 'Value', variable.binding, variable.valueType, (binding) => { variable.binding = binding; }, `variable-${variable.id}-binding`);
    const dependencies = variable.binding?.mode === 'expression' ? variable.binding.expression.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [] : [];
    const usage = document.createElement('div'); usage.className = 'hint'; usage.textContent = `Used ${expressionUses(draft.graph, variable.name)} time(s)${dependencies.length ? ` · Depends on ${dependencies.join(', ')}` : ''}`; card.appendChild(usage); list.appendChild(card);
  }
}

function addLocalVariable() {
  if (draft?.kind !== 'advanced') return;
  const id = crypto.randomUUID(); mutate(() => { draft.variables ||= []; draft.variables.push({ id, name: `value${draft.variables.length + 1}`, valueType: 'scalar', binding: { mode: 'literal', value: 1 } }); }, true, `variable-${id}-name`);
  $('variables-section').open = true;
}

function distributeAir() {
  const airNodes = draft.graph.nodes.filter(({ type }) => type === 'air'); if (!airNodes.length) { status('Add at least one Run Air action first.', true); return; }
  mutate(() => {
    draft.variables ||= []; let variable = draft.variables.find(({ name }) => name === 'totalFillTime');
    if (!variable) { const total = airNodes.reduce((sum, item) => sum + (item.config.duration?.mode === 'literal' ? Number(item.config.duration.value) || 0 : 0), 0) || 55; variable = { id: crypto.randomUUID(), name: 'totalFillTime', valueType: 'duration', binding: { mode: 'literal', value: total } }; draft.variables.push(variable); }
    for (const item of airNodes) item.config.duration = { mode: 'expression', expression: 'totalFillTime / airActionCount' };
  });
  $('variables-section').open = true; status('Air actions now share totalFillTime equally.');
}

async function validateDraft(focus = false) {
  if (!draft || selected.kind === 'variable') { clearErrors(); return true; }
  try {
    const result = await api.validate(selected.kind, draft);
    if (result.errors.length) { showErrors(result.errors, focus); status('Validation found issues.', true); return false; }
    clearErrors(); status('Valid — ready to save and run.'); return true;
  } catch (error) { showErrors([error.message], focus); status(error.message, true); return false; }
}

async function save() {
  if (!draft || locked) return;
  if (!(await validateDraft(true))) return;
  try { const saved = await api.save(selected.kind, draft); draft = clone(saved); setDirty(false); clearErrors(); status('Saved and validated.'); await reload(false); }
  catch (error) { showErrors([error.message], true); status(error.message, true); }
}

async function reload(preserveDraft = true) {
  const response = await api.get(); library = response.library; locked = response.locked;
  if (selected) {
    const entity = findEntity(selected.kind, selected.id);
    if (!entity) { selected = null; draft = null; selectedNodeId = null; }
    else if (!preserveDraft) draft = clone(entity);
  }
  $('lock-banner').hidden = !locked; renderAll();
}

async function create(kind) {
  if (dirty && !window.confirm('Discard unsaved changes?')) return;
  try { const entity = await api.create(kind); await reload(); selectEntity(kind === 'simple' || kind === 'advanced' ? 'preset' : kind, entity.id, true, 'entity-name'); }
  catch (error) { status(error.message, true); }
}

async function duplicate() { if (!selected) return; try { const entity = await api.duplicate(selected.kind, selected.id); await reload(); selectEntity(selected.kind, entity.id, true, 'entity-name'); } catch (error) { status(error.message, true); } }
async function convert() { try { const entity = await api.convert(draft.id); await reload(); selectEntity('preset', entity.id, true, 'entity-name'); } catch (error) { status(error.message, true); } }

async function removeEntity() {
  if (!selected || !window.confirm(`Delete “${draft.name}”?`)) return;
  const entries = libraryEntries(); const index = entries.findIndex(([kind, item]) => kind === selected.kind && item.id === selected.id); const next = entries[index + 1] || entries[index - 1];
  try {
    await api.delete(selected.kind, selected.id); selected = null; draft = null; selectedNodeId = null; setDirty(false); await reload();
    if (next && findEntity(next[0], next[1].id)) selectEntity(next[0], next[1].id, true, `library-${entityKey(next[0], next[1].id)}`);
    else renderAll(); status('Item deleted.');
  } catch (error) { status(error.message, true); }
}

async function moveRunnable(delta) {
  if (!selected || selected.kind === 'variable') return; const order = clone(library.runnableOrder); const index = order.findIndex((ref) => ref.kind === selected.kind && ref.id === selected.id); const target = index + delta;
  if (index < 0 || target < 0 || target >= order.length) return;
  [order[index], order[target]] = [order[target], order[index]];
  try { await api.reorder(order); await reload(); focusAfterRender(`library-${entityKey(selected.kind, selected.id)}`); status('Controller order updated.'); } catch (error) { status(error.message, true); }
}

function undo() { if (!undoStack.length || locked) return; const focusKey = focusKeyOfActiveElement(); redoStack.push(clone(draft)); draft = undoStack.pop(); setDirty(true); clearErrors(); renderAll(); focusAfterRender(focusKey); }
function redo() { if (!redoStack.length || locked) return; const focusKey = focusKeyOfActiveElement(); undoStack.push(clone(draft)); draft = redoStack.pop(); setDirty(true); clearErrors(); renderAll(); focusAfterRender(focusKey); }

async function importLibrary() {
  try {
    const picked = await api.pickImport(); if (picked.canceled) return;
    const message = `Import ${picked.summary.presets} presets, ${picked.summary.workflows} workflows, and ${picked.summary.variables} variables?\n\nOK merges them. Cancel leaves the library unchanged.`;
    if (!window.confirm(message)) return;
    const replace = window.confirm('Replace the complete current library?\n\nOK replaces it after creating a backup. Cancel performs a safe merge.');
    await api.import(picked.bundle, replace ? 'replace' : 'merge'); selected = null; draft = null; selectedNodeId = null; setDirty(false); await reload(); status('Library imported.');
  } catch (error) { status(error.message, true); }
}

function attachMenu(trigger, menu) {
  menu._trigger = trigger;
  const open = () => { closeMenus(menu); menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); menu.querySelector('button:not(:disabled)')?.focus(); };
  trigger.addEventListener('click', (event) => { event.stopPropagation(); if (menu.hidden) open(); else closeMenu(menu, true); });
  trigger.addEventListener('keydown', (event) => { if (event.key === 'ArrowDown') { event.preventDefault(); open(); } });
  menu.addEventListener('click', (event) => { if (event.target.closest('button')) closeMenu(menu, false); });
  menu.addEventListener('keydown', (event) => {
    const items = [...menu.querySelectorAll('button:not(:disabled)')]; const index = items.indexOf(document.activeElement);
    if (event.key === 'Escape') { event.preventDefault(); closeMenu(menu, true); }
    else if (event.key === 'ArrowDown') { event.preventDefault(); (items[index + 1] || items[0])?.focus(); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); (items[index - 1] || items.at(-1))?.focus(); }
    else if (event.key === 'Home') { event.preventDefault(); items[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); items.at(-1)?.focus(); }
  });
}

function closeMenu(menu, restore = false) { if (!menu || menu.hidden) return; menu.hidden = true; menu._trigger?.setAttribute('aria-expanded', 'false'); if (restore) menu._trigger?.focus(); }
function closeMenus(except = null) { document.querySelectorAll('.menu:not([hidden])').forEach((menu) => { if (menu !== except) closeMenu(menu); }); }

attachMenu($('new-btn'), $('new-menu')); attachMenu($('more-btn'), $('more-menu')); attachMenu($('entity-menu-btn'), $('entity-menu'));
document.addEventListener('click', (event) => { if (!event.target.closest('.menu-wrap')) closeMenus(); });
document.querySelectorAll('[data-create]').forEach((button) => button.addEventListener('click', () => create(button.dataset.create)));
$('search').addEventListener('input', renderLibrary);
$('entity-name').addEventListener('change', () => {
  if (!draft) return; const input = $('entity-name'); const value = selected.kind === 'variable' ? input.value.replace(/[^A-Za-z0-9_]/g, '') : input.value; input.value = value;
  mutate(() => { draft.name = value; }, false); const rowName = document.querySelector(`.library-item[data-kind="${selected.kind}"][data-id="${CSS.escape(selected.id)}"] .name`); if (rowName) rowName.textContent = value;
});
$('save-btn').addEventListener('click', save); $('validate-btn').addEventListener('click', () => validateDraft(true));
$('duplicate-btn').addEventListener('click', duplicate); $('convert-btn').addEventListener('click', convert); $('delete-btn').addEventListener('click', removeEntity);
$('move-up-btn').addEventListener('click', () => moveRunnable(-1)); $('move-down-btn').addEventListener('click', () => moveRunnable(1));
$('layout-btn').addEventListener('click', resetLayout); $('distribute-btn').addEventListener('click', distributeAir); $('add-variable-btn').addEventListener('click', addLocalVariable);
$('edit-connections-btn').addEventListener('click', () => { if (!draft?.graph || locked) return; editConnections = !editConnections; pendingSource = null; if (!editConnections) applyLayout(); renderGraph(); updateButtons(); status(editConnections ? 'Connection editing enabled.' : 'Managed sequence enabled.'); });
$('zoom-out-btn').addEventListener('click', () => setZoom(zoom - 0.1)); $('zoom-in-btn').addEventListener('click', () => setZoom(zoom + 0.1)); $('fit-btn').addEventListener('click', fitGraph);
$('undo-btn').addEventListener('click', undo); $('redo-btn').addEventListener('click', redo); $('export-btn').addEventListener('click', () => api.export()); $('import-btn').addEventListener('click', importLibrary);

window.addEventListener('keydown', (event) => {
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === 's') { event.preventDefault(); save(); }
  else if (modifier && event.key.toLowerCase() === 'z' && event.shiftKey) { event.preventDefault(); redo(); }
  else if (modifier && event.key.toLowerCase() === 'z') { event.preventDefault(); undo(); }
  else if (event.key === 'Escape') { const openMenu = document.querySelector('.menu:not([hidden])'); if (openMenu) closeMenu(openMenu, true); else if (pendingSource) { pendingSource = null; renderGraph(); status('Connection cancelled.'); } }
});
window.addEventListener('beforeunload', (event) => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });

const viewport = $('canvas-viewport');
viewport.addEventListener('wheel', (event) => { if (event.ctrlKey || event.metaKey) { event.preventDefault(); setZoom(zoom + (event.deltaY < 0 ? 0.1 : -0.1)); } }, { passive: false });
viewport.addEventListener('pointerdown', (event) => {
  if (!['canvas-viewport', 'canvas', 'edge-layer', 'drop-layer'].includes(event.target.id)) return;
  const start = { x: event.clientX, y: event.clientY, left: viewport.scrollLeft, top: viewport.scrollTop };
  const move = (moveEvent) => { viewport.scrollLeft = start.left - (moveEvent.clientX - start.x); viewport.scrollTop = start.top - (moveEvent.clientY - start.y); };
  const up = () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
  window.addEventListener('pointermove', move); window.addEventListener('pointerup', up, { once: true });
});
viewport.addEventListener('dragover', (event) => {
  if (!canAcceptDrag(event.dataTransfer)) return;
  event.preventDefault(); event.dataTransfer.dropEffect = [...event.dataTransfer.types].includes(PRESET_MIME) ? 'copy' : 'move';
  highlightDropTarget(dropTargetAtClientX(event.clientX));
});
viewport.addEventListener('drop', (event) => {
  if (!canAcceptDrag(event.dataTransfer) || event.target.closest('.drop-target')) return;
  event.preventDefault();
  const beforeId = dropTargetAtClientX(event.clientX);
  if (beforeId) acceptDrop(event.dataTransfer, beforeId);
  clearDragState();
});

api.onChanged((next) => { library = next; if (!dirty && selected) { const entity = findEntity(selected.kind, selected.id); if (entity) draft = clone(entity); } renderAll(); });
api.onLock((value) => { locked = value; $('lock-banner').hidden = !locked; clearDragState(); renderAll(); status(locked ? 'Library locked while a run is active.' : 'Library unlocked.'); });
api.appearance.onChanged((theme) => applyTheme(theme, theme !== 'default'));
api.appearance.get().then(({ theme }) => applyTheme(theme));

reload().catch((error) => status(error.message, true));
