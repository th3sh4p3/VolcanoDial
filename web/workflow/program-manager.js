import { EventEmitter, randomUUID } from '../compat.js';

import {
  MIN_TEMP, MAX_TEMP, TEMP_STEP, MIN_FILL_TIME, MAX_FILL_TIME, MIN_STEPS, MAX_STEPS,
} from '../ble/ble-constants.js';
import { compileSimplePreset, validatePreset, validateWorkflow } from './compiler.js';
import { createVariableContext } from './expression.js';

export const SETTINGS_VERSION = 2;
const clone = (value) => structuredClone(value);
const refKey = (ref) => ref ? `${ref.kind}:${ref.id}` : '';

function rewriteExpressionIdentifiers(value, names) {
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'expression' && typeof item === 'string') value[key] = item.replace(/[A-Za-z_][A-Za-z0-9_]*/g, (name) => names.get(name) || name);
    else rewriteExpressionIdentifiers(item, names);
  }
}

function referencesExpressionIdentifier(value, target) {
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(([key, item]) => key === 'expression' && typeof item === 'string'
    ? item.split(/[^A-Za-z0-9_]+/).includes(target)
    : referencesExpressionIdentifier(item, target));
}

function node(type, x, config = undefined) {
  return { id: randomUUID(), type, position: { x, y: 160 }, ...(config ? { config } : {}) };
}

function linearGraph(nodes) {
  return {
    nodes,
    edges: nodes.slice(0, -1).map((item, index) => ({ id: randomUUID(), source: item.id, target: nodes[index + 1].id })),
  };
}

function defaultPrograms() {
  return [
    [170, 190, 55, 3], [170, 200, 55, 4], [170, 210, 55, 5], [170, 220, 55, 6], [170, 230, 55, 7],
    [170, 190, 75, 3], [170, 200, 75, 4], [170, 210, 75, 5], [170, 220, 75, 6], [170, 230, 75, 7],
  ].map(([startTemp, endTemp, fillTime, steps], index) => ({
    id: randomUUID(), name: `Preset ${String(index + 1).padStart(2, '0')}`, kind: 'simple', startTemp, endTemp, fillTime, steps,
  }));
}

function ensureName(entity, label) {
  if (!entity?.id || typeof entity.id !== 'string') throw new Error(`${label} must have an ID`);
  if (typeof entity.name !== 'string' || !entity.name.trim()) throw new Error(`${label} must have a name`);
}

function validateSimple(preset) {
  ensureName(preset, 'Preset');
  for (const field of ['startTemp', 'endTemp', 'fillTime', 'steps']) {
    if (!Number.isFinite(preset[field])) throw new Error(`Preset ${field} must be numeric`);
  }
  if (preset.startTemp < MIN_TEMP || preset.endTemp > MAX_TEMP || preset.startTemp > preset.endTemp) throw new Error('Preset temperature range is invalid');
  if (preset.fillTime < MIN_FILL_TIME || preset.fillTime > MAX_FILL_TIME) throw new Error('Preset fill time is invalid');
  if (!Number.isInteger(preset.steps) || preset.steps < MIN_STEPS || preset.steps > MAX_STEPS) throw new Error('Preset step count is invalid');
}

export function normalizeSettings(raw = {}) {
  let presets; let workflows; let globalVariables; let runnableOrder; let activeRunnable; let migrated = false;
  if (Number.isFinite(raw.settingsVersion) && raw.settingsVersion > SETTINGS_VERSION) throw new Error(`Settings version ${raw.settingsVersion} is newer than this app supports`);
  if (raw.settingsVersion === SETTINGS_VERSION) {
    if (!Array.isArray(raw.presets) || !Array.isArray(raw.workflows) || !Array.isArray(raw.globalVariables)) throw new Error('Version 2 settings library is incomplete');
    presets = clone(raw.presets); workflows = clone(raw.workflows); globalVariables = clone(raw.globalVariables);
    runnableOrder = clone(raw.runnableOrder || []); activeRunnable = clone(raw.activeRunnable || null);
  } else if (Array.isArray(raw.programs) && raw.programs.length) {
    migrated = true;
    presets = raw.programs.map((program) => ({ ...clone(program), kind: 'simple' }));
    workflows = []; globalVariables = [];
    runnableOrder = presets.map(({ id }) => ({ kind: 'preset', id }));
    activeRunnable = { kind: 'preset', id: raw.activeProgramId || presets[0].id };
  } else {
    migrated = true; presets = defaultPrograms(); workflows = []; globalVariables = [];
    runnableOrder = presets.map(({ id }) => ({ kind: 'preset', id }));
    activeRunnable = { kind: 'preset', id: presets[0].id };
  }

  const ids = new Set();
  for (const preset of presets) {
    ensureName(preset, 'Preset');
    if (ids.has(preset.id)) throw new Error(`Duplicate entity ID "${preset.id}"`);
    ids.add(preset.id);
    if (!preset.kind) preset.kind = 'simple';
    if (preset.kind === 'simple') validateSimple(preset);
    else if (preset.kind !== 'advanced') throw new Error(`Unknown preset kind "${preset.kind}"`);
  }
  for (const variable of globalVariables) {
    ensureName(variable, 'Variable');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.name)) throw new Error(`Variable name "${variable.name}" is invalid`);
    if (ids.has(variable.id)) throw new Error(`Duplicate entity ID "${variable.id}"`);
    ids.add(variable.id);
    if (!['temperature', 'duration', 'scalar'].includes(variable.valueType)) throw new Error(`Invalid variable type for "${variable.name}"`);
  }
  const variableNames = new Set();
  for (const variable of globalVariables) {
    if (variableNames.has(variable.name)) throw new Error(`Duplicate global variable "${variable.name}"`);
    variableNames.add(variable.name);
  }
  createVariableContext(globalVariables);
  for (const preset of presets.filter(({ kind }) => kind === 'advanced')) {
    const errors = validatePreset(preset, globalVariables);
    if (errors.length) throw new Error(`${preset.name}: ${errors.join('; ')}`);
  }
  for (const workflow of workflows) {
    ensureName(workflow, 'Workflow');
    if (ids.has(workflow.id)) throw new Error(`Duplicate entity ID "${workflow.id}"`);
    ids.add(workflow.id);
    if (workflow.fillTimeSource == null) workflow.fillTimeSource = 'presets';
    if (workflow.fillTime == null) workflow.fillTime = 55;
    const errors = validateWorkflow(workflow, presets, globalVariables);
    if (errors.length) throw new Error(`${workflow.name}: ${errors.join('; ')}`);
  }

  const validRefs = [...presets.map(({ id }) => ({ kind: 'preset', id })), ...workflows.map(({ id }) => ({ kind: 'workflow', id }))];
  const validKeys = new Set(validRefs.map(refKey)); const seen = new Set();
  runnableOrder = runnableOrder.filter((ref) => { const key = refKey(ref); if (!validKeys.has(key) || seen.has(key)) return false; seen.add(key); return true; });
  runnableOrder.push(...validRefs.filter((ref) => !seen.has(refKey(ref))));
  if (!activeRunnable || !validKeys.has(refKey(activeRunnable))) activeRunnable = runnableOrder[0] || null;
  return { settingsVersion: SETTINGS_VERSION, presets, workflows, globalVariables, runnableOrder, activeRunnable, migrated };
}

export class ProgramManager extends EventEmitter {
  constructor() { super(); this._library = normalizeSettings({}); }
  get programs() { return this._library.presets; }
  get presets() { return this._library.presets; }
  get workflows() { return this._library.workflows; }
  get globalVariables() { return this._library.globalVariables; }
  get runnableOrder() { return this._library.runnableOrder; }
  get activeRunnableRef() { return this._library.activeRunnable; }
  get activeProgramId() { return this.activeProgram?.id || null; }
  get activeProgram() { return this.activeRunnable?.kind === 'preset' ? this.activeRunnable.entity : null; }
  get activeRunnable() {
    const ref = this._library.activeRunnable;
    if (!ref) return null;
    const entity = (ref.kind === 'workflow' ? this.workflows : this.presets).find(({ id }) => id === ref.id);
    return entity ? { kind: ref.kind, entity } : null;
  }

  loadFromSettings(settings) { this._library = normalizeSettings(settings); const migrated = this._library.migrated; this._notifyChange(); return { migrated }; }
  toSettings() { const { migrated: _migrated, ...data } = this._library; return clone(data); }
  snapshot() { return this.toSettings(); }
  selectNextProgram() { return this.selectRunnable(1); }
  selectPreviousProgram() { return this.selectRunnable(-1); }
  selectProgram(id) { return this.selectByRef({ kind: 'preset', id }); }

  selectRunnable(direction) {
    if (!this.runnableOrder.length) return null;
    const current = this.runnableOrder.findIndex((ref) => refKey(ref) === refKey(this._library.activeRunnable));
    const next = (Math.max(current, 0) + direction + this.runnableOrder.length) % this.runnableOrder.length;
    this._library.activeRunnable = clone(this.runnableOrder[next]); this._notifyChange(); return this.activeRunnable;
  }
  selectByRef(ref) {
    if (!this.runnableOrder.some((item) => refKey(item) === refKey(ref))) return null;
    this._library.activeRunnable = clone(ref); this._notifyChange(); return this.activeRunnable;
  }

  adjustActiveProgram(param, direction) {
    const runnable = this.activeRunnable;
    const preset = runnable?.kind === 'preset' && runnable.entity.kind === 'simple' ? runnable.entity : null;
    const workflow = runnable?.kind === 'workflow' && runnable.entity.fillTimeSource === 'ui' ? runnable.entity : null;
    if (!preset && !(workflow && param === 'fillTime')) return null;
    const delta = direction < 0 ? -1 : 1;
    const target = workflow || preset;
    if (param === 'startTemp') preset.startTemp = Math.min(preset.endTemp, Math.max(MIN_TEMP, preset.startTemp + delta * TEMP_STEP));
    else if (param === 'endTemp') preset.endTemp = Math.max(preset.startTemp, Math.min(MAX_TEMP, preset.endTemp + delta * TEMP_STEP));
    else if (param === 'fillTime') target.fillTime = Math.max(MIN_FILL_TIME, Math.min(MAX_FILL_TIME, target.fillTime + delta));
    else if (param === 'steps') preset.steps = Math.max(MIN_STEPS, Math.min(MAX_STEPS, preset.steps + delta));
    else return target;
    this._notifyChange(); return target;
  }

  createPreset(kind = 'simple', name) {
    let preset;
    if (kind === 'advanced') {
      const start = node('start', 40); const heat = node('reachTemperature', 260, { temperature: { mode: 'literal', value: 170 }, timeout: { mode: 'literal', value: 360 } });
      const air = node('air', 480, { duration: { mode: 'literal', value: 55 } }); const end = node('end', 700);
      preset = { id: randomUUID(), name: name || `Advanced Preset ${this.presets.length + 1}`, kind, variables: [], graph: linearGraph([start, heat, air, end]) };
    } else preset = { id: randomUUID(), name: name || `Preset ${this.presets.length + 1}`, kind: 'simple', startTemp: 170, endTemp: 200, fillTime: 55, steps: 4 };
    this.presets.push(preset); this.runnableOrder.push({ kind: 'preset', id: preset.id }); this._library.activeRunnable = { kind: 'preset', id: preset.id };
    this._notifyChange(); return clone(preset);
  }

  createWorkflow(name) {
    if (!this.presets.length) throw new Error('Create a preset before creating a workflow');
    const start = node('start', 40); const step = node('preset', 280, { presetId: this.presets[0].id }); const end = node('end', 520);
    const workflow = { id: randomUUID(), name: name || `Workflow ${this.workflows.length + 1}`, fillTimeSource: 'presets', fillTime: 55, graph: linearGraph([start, step, end]) };
    this.workflows.push(workflow); this.runnableOrder.push({ kind: 'workflow', id: workflow.id }); this._library.activeRunnable = { kind: 'workflow', id: workflow.id };
    this._notifyChange(); return clone(workflow);
  }

  createVariable(name) {
    const variable = { id: randomUUID(), name: name || `globalValue${this.globalVariables.length + 1}`, valueType: 'scalar', binding: { mode: 'literal', value: 1 } };
    if (this.globalVariables.some((item) => item.name === variable.name)) variable.name = `${variable.name}_${variable.id.slice(0, 4)}`;
    this.globalVariables.push(variable); this._notifyChange(); return clone(variable);
  }

  saveEntity(kind, draft) {
    const value = clone(draft);
    const candidate = this.snapshot();
    if (kind === 'preset') {
      const index = candidate.presets.findIndex(({ id }) => id === value.id); if (index < 0) throw new Error('Preset not found'); candidate.presets[index] = value;
      const oldVariables = new Map((this.presets[index].variables || []).map((item) => [item.id, item.name]));
      const renames = new Map((value.variables || []).filter((item) => oldVariables.has(item.id) && oldVariables.get(item.id) !== item.name).map((item) => [oldVariables.get(item.id), item.name]));
      rewriteExpressionIdentifiers(value, renames);
    } else if (kind === 'workflow') {
      const index = candidate.workflows.findIndex(({ id }) => id === value.id); if (index < 0) throw new Error('Workflow not found'); candidate.workflows[index] = value;
    } else if (kind === 'variable') {
      const index = candidate.globalVariables.findIndex(({ id }) => id === value.id);
      if (index < 0) candidate.globalVariables.push(value);
      else {
        const oldName = candidate.globalVariables[index].name;
        candidate.globalVariables[index] = value;
        if (oldName !== value.name) rewriteExpressionIdentifiers(candidate, new Map([[oldName, value.name]]));
      }
    } else throw new Error('Unknown library entity type');
    this._library = normalizeSettings(candidate);
    this._notifyChange(); return clone(value);
  }

  duplicate(kind, id) {
    const collection = kind === 'workflow' ? this.workflows : kind === 'variable' ? this.globalVariables : this.presets; const source = collection.find((item) => item.id === id); if (!source) throw new Error('Item not found');
    const copy = clone(source); copy.id = randomUUID(); copy.name = kind === 'variable' ? `${copy.name}_copy` : `${copy.name} Copy`;
    if (kind === 'variable') while (this.globalVariables.some((item) => item.name === copy.name)) copy.name = `${copy.name}_copy`;
    if (copy.graph) { const idMap = new Map(copy.graph.nodes.map((item) => [item.id, randomUUID()])); copy.graph.nodes.forEach((item) => { item.id = idMap.get(item.id); }); copy.graph.edges.forEach((edge) => { edge.id = randomUUID(); edge.source = idMap.get(edge.source); edge.target = idMap.get(edge.target); }); }
    collection.push(copy);
    if (kind !== 'variable') { this.runnableOrder.push({ kind, id: copy.id }); this._library.activeRunnable = { kind, id: copy.id }; }
    this._notifyChange(); return clone(copy);
  }

  convertSimple(id) {
    const source = this.presets.find((preset) => preset.id === id && preset.kind === 'simple'); if (!source) throw new Error('Simple preset not found');
    const plan = compileSimplePreset(source); const graphNodes = [node('start', 40)]; let x = 260;
    for (const action of plan.actions) { const config = action.type === 'reachTemperature' ? { temperature: { mode: 'literal', value: action.temperature }, timeout: { mode: 'literal', value: action.timeoutSeconds } } : { duration: { mode: 'literal', value: action.durationSeconds } }; graphNodes.push(node(action.type, x, config)); x += 220; }
    graphNodes.push(node('end', x));
    const converted = { id: randomUUID(), name: `${source.name} Advanced`, kind: 'advanced', variables: [], graph: linearGraph(graphNodes) };
    this.presets.push(converted); this.runnableOrder.push({ kind: 'preset', id: converted.id }); this._library.activeRunnable = { kind: 'preset', id: converted.id }; this._notifyChange(); return clone(converted);
  }

  delete(kind, id) {
    if (kind === 'preset') { const references = this.workflows.filter((workflow) => workflow.graph.nodes.some((item) => item.type === 'preset' && item.config?.presetId === id)); if (references.length) throw new Error(`Preset is used by: ${references.map(({ name }) => name).join(', ')}`); }
    if (kind === 'variable') {
      const variable = this.globalVariables.find((item) => item.id === id); if (!variable) throw new Error('Variable not found');
      const references = this.presets.filter((preset) => preset.kind === 'advanced' && referencesExpressionIdentifier(preset, variable.name)); if (references.length) throw new Error(`Variable is used by: ${references.map(({ name }) => name).join(', ')}`);
      this._library.globalVariables = this.globalVariables.filter((item) => item.id !== id);
    } else {
      const collectionKey = kind === 'workflow' ? 'workflows' : 'presets'; this._library[collectionKey] = this._library[collectionKey].filter((item) => item.id !== id);
      this._library.runnableOrder = this.runnableOrder.filter((ref) => !(ref.kind === kind && ref.id === id)); if (refKey(this._library.activeRunnable) === `${kind}:${id}`) this._library.activeRunnable = clone(this.runnableOrder[0] || null);
    }
    this._notifyChange();
  }

  reorder(order) { const keys = new Set(this.runnableOrder.map(refKey)); if (!Array.isArray(order) || order.length !== keys.size || order.some((ref) => !keys.has(refKey(ref)))) throw new Error('Runnable order is invalid'); this._library.runnableOrder = clone(order); this._notifyChange(); }
  exportBundle() { return JSON.stringify(this.toSettings(), null, 2); }

  importBundle(bundle, mode = 'merge') {
    const incoming = normalizeSettings(typeof bundle === 'string' ? JSON.parse(bundle) : clone(bundle));
    if (mode === 'replace') this._library = incoming;
    else {
      const merged = this.snapshot();
      const idMap = new Map();
      for (const item of [...incoming.presets, ...incoming.workflows, ...incoming.globalVariables]) idMap.set(item.id, randomUUID());
      const reservedNames = new Set([
        ...merged.globalVariables.map(({ name }) => name),
        ...merged.presets.flatMap((preset) => (preset.variables || []).map(({ name }) => name)),
        ...incoming.presets.flatMap((preset) => (preset.variables || []).map(({ name }) => name)),
      ]);
      const nameMap = new Map();
      for (const variable of incoming.globalVariables) {
        let name = variable.name;
        while (reservedNames.has(name)) name = `${name}_imported`;
        reservedNames.add(name); nameMap.set(variable.name, name);
      }
      for (const variable of incoming.globalVariables) { const copy = { ...clone(variable), id: idMap.get(variable.id), name: nameMap.get(variable.name) }; rewriteExpressionIdentifiers(copy, nameMap); merged.globalVariables.push(copy); }
      for (const preset of incoming.presets) {
        const copy = { ...clone(preset), id: idMap.get(preset.id), name: `${preset.name} Imported` };
        rewriteExpressionIdentifiers(copy, nameMap); merged.presets.push(copy);
      }
      for (const workflow of incoming.workflows) {
        const copy = { ...clone(workflow), id: idMap.get(workflow.id), name: `${workflow.name} Imported` };
        copy.graph.nodes.forEach((item) => { if (item.type === 'preset') item.config.presetId = idMap.get(item.config.presetId) || item.config.presetId; });
        merged.workflows.push(copy);
      }
      for (const ref of incoming.runnableOrder) merged.runnableOrder.push({ kind: ref.kind, id: idMap.get(ref.id) });
      this._library = normalizeSettings(merged);
    }
    this._notifyChange(); return this.snapshot();
  }

  _notifyChange() {
    this._library.migrated = false; const snapshot = this.snapshot(); this.emit('libraryChanged', snapshot);
    this.emit('programsChanged', { programs: snapshot.presets, activeProgramId: this.activeProgramId }); this.emit('activeProgramChanged', { program: this.activeProgram });
  }
}

export const programManager = new ProgramManager();
