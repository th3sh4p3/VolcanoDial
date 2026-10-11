import { MAX_TEMP, MIN_TEMP, MIN_FILL_TIME, MAX_FILL_TIME, MIN_STEPS, MAX_STEPS } from '../ble/ble-constants.js';
import { createVariableContext, evaluateBinding } from './expression.js';

const NODE_TYPES = new Set(['start', 'end', 'reachTemperature', 'wait', 'air', 'heaterOff']);
const WORKFLOW_NODE_TYPES = new Set(['start', 'end', 'preset']);

function clone(value) {
  return structuredClone(value);
}

export function orderedGraphNodes(graph, allowedTypes = NODE_TYPES) {
  const errors = [];
  if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    return { nodes: [], errors: ['Graph must contain nodes and edges arrays'] };
  }
  const byId = new Map();
  for (const node of graph.nodes) {
    if (!node?.id || byId.has(node.id)) errors.push('Every node must have a unique ID');
    else byId.set(node.id, node);
    if (!allowedTypes.has(node?.type)) errors.push(`Unsupported node type "${node?.type}"`);
  }
  const starts = graph.nodes.filter((node) => node.type === 'start');
  const ends = graph.nodes.filter((node) => node.type === 'end');
  if (starts.length !== 1) errors.push('Graph must have exactly one Start node');
  if (ends.length !== 1) errors.push('Graph must have exactly one End node');

  const outgoing = new Map();
  const incoming = new Map();
  for (const edge of graph.edges) {
    if (!byId.has(edge?.source) || !byId.has(edge?.target)) {
      errors.push('Every edge must reference existing nodes');
      continue;
    }
    if (outgoing.has(edge.source)) errors.push(`Node "${edge.source}" has multiple outgoing connections`);
    if (incoming.has(edge.target)) errors.push(`Node "${edge.target}" has multiple incoming connections`);
    outgoing.set(edge.source, edge.target);
    incoming.set(edge.target, edge.source);
  }
  if (errors.length || starts.length !== 1 || ends.length !== 1) return { nodes: [], errors };

  const ordered = [];
  const visited = new Set();
  let current = starts[0];
  while (current) {
    if (visited.has(current.id)) {
      errors.push('Graph contains a cycle');
      break;
    }
    visited.add(current.id);
    ordered.push(current);
    if (current.type === 'end') break;
    const nextId = outgoing.get(current.id);
    if (!nextId) {
      errors.push(`Node "${current.id}" is not connected to End`);
      break;
    }
    current = byId.get(nextId);
  }
  if (ordered.at(-1)?.type !== 'end') errors.push('Execution path must finish at End');
  if (visited.size !== graph.nodes.length) errors.push('Graph contains disconnected or orphan nodes');
  if (incoming.has(starts[0].id)) errors.push('Start cannot have an incoming connection');
  if (outgoing.has(ends[0].id)) errors.push('End cannot have an outgoing connection');
  return { nodes: ordered, errors: [...new Set(errors)] };
}

function range(value, min, max, label) {
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${label} must be between ${min} and ${max}`);
  }
  return value;
}

export function compileSimplePreset(preset) {
  const count = Math.max(1, Math.round(preset.steps || 1));
  const actions = [];
  for (let index = 0; index < count; index++) {
    const temperature = count === 1
      ? preset.endTemp
      : Math.round(preset.startTemp + (preset.endTemp - preset.startTemp) * index / (count - 1));
    actions.push({ type: 'reachTemperature', temperature, timeoutSeconds: 360 });
    actions.push({ type: 'wait', durationSeconds: 2 });
    actions.push({ type: 'air', durationSeconds: preset.fillTime / count });
  }
  return { presetId: preset.id, presetName: preset.name, actions };
}

export function compileAdvancedPreset(preset, globalVariables = []) {
  const ordered = orderedGraphNodes(preset.graph);
  if (ordered.errors.length) throw new Error(ordered.errors.join('; '));
  const airActionCount = ordered.nodes.filter((node) => node.type === 'air').length;
  const context = createVariableContext(globalVariables, preset.variables || [], {
    airActionCount: { value: airActionCount, valueType: 'scalar' },
  });
  const actions = [];
  for (const node of ordered.nodes) {
    const config = node.config || {};
    if (node.type === 'reachTemperature') {
      const temperature = range(evaluateBinding(config.temperature, 'temperature', context), MIN_TEMP, MAX_TEMP, 'Temperature');
      const timeoutSeconds = range(evaluateBinding(config.timeout || { mode: 'literal', value: 360 }, 'duration', context), 1, 1800, 'Heat timeout');
      actions.push({ type: node.type, nodeId: node.id, temperature, timeoutSeconds });
    } else if (node.type === 'wait') {
      const durationSeconds = range(evaluateBinding(config.duration, 'duration', context), 0.1, 3600, 'Wait duration');
      actions.push({ type: node.type, nodeId: node.id, durationSeconds });
    } else if (node.type === 'air') {
      const durationSeconds = range(evaluateBinding(config.duration, 'duration', context), 0.1, 3600, 'Air duration');
      actions.push({ type: node.type, nodeId: node.id, durationSeconds });
    } else if (node.type === 'heaterOff') {
      actions.push({ type: node.type, nodeId: node.id });
    }
  }
  return { presetId: preset.id, presetName: preset.name, actions };
}

export function compilePreset(preset, globalVariables = []) {
  if (!preset) throw new Error('Preset not found');
  if (preset.kind === 'simple' || !preset.kind) return compileSimplePreset(preset);
  if (preset.kind === 'advanced') return compileAdvancedPreset(preset, globalVariables);
  throw new Error(`Unsupported preset kind "${preset.kind}"`);
}

function applyTotalFillTime(plan, fillTime) {
  const airActions = plan.actions.filter((action) => action.type === 'air');
  if (!airActions.length) return plan;
  const currentTotal = airActions.reduce((sum, action) => sum + action.durationSeconds, 0);
  if (!(currentTotal > 0)) throw new Error(`Preset "${plan.presetName}" has no usable air duration`);
  const scale = fillTime / currentTotal;
  for (const action of airActions) action.durationSeconds *= scale;
  return plan;
}

export function compileWorkflow(workflow, presets, globalVariables = []) {
  const ordered = orderedGraphNodes(workflow.graph, WORKFLOW_NODE_TYPES);
  if (ordered.errors.length) throw new Error(ordered.errors.join('; '));
  const fillTimeSource = workflow.fillTimeSource || 'presets';
  if (!['presets', 'ui'].includes(fillTimeSource)) throw new Error('Workflow fill time source is invalid');
  if (fillTimeSource === 'ui') range(workflow.fillTime, MIN_FILL_TIME, MAX_FILL_TIME, 'Workflow fill time');
  const byId = new Map(presets.map((preset) => [preset.id, preset]));
  const stages = ordered.nodes.filter((node) => node.type === 'preset').map((node) => {
    const preset = byId.get(node.config?.presetId);
    if (!preset) throw new Error(`Workflow references missing preset "${node.config?.presetId}"`);
    const plan = compilePreset(clone(preset), clone(globalVariables));
    return fillTimeSource === 'ui' ? applyTotalFillTime(plan, workflow.fillTime) : plan;
  });
  if (!stages.length) throw new Error('Workflow must contain at least one preset');
  return { workflowId: workflow.id, workflowName: workflow.name, fillTimeSource, fillTime: fillTimeSource === 'ui' ? workflow.fillTime : null, stages };
}

export function validatePreset(preset, globalVariables = []) {
  const errors = [];
  try {
    if (!preset || typeof preset !== 'object') throw new Error('Preset is required');
    if (preset.kind === 'simple' || !preset.kind) {
      if (!Number.isFinite(preset.startTemp) || !Number.isFinite(preset.endTemp) || preset.startTemp < MIN_TEMP || preset.endTemp > MAX_TEMP || preset.startTemp > preset.endTemp) throw new Error('Preset temperature range is invalid');
      if (!Number.isFinite(preset.fillTime) || preset.fillTime < MIN_FILL_TIME || preset.fillTime > MAX_FILL_TIME) throw new Error('Preset fill time is invalid');
      if (!Number.isInteger(preset.steps) || preset.steps < MIN_STEPS || preset.steps > MAX_STEPS) throw new Error('Preset step count is invalid');
      const plan = compileSimplePreset(preset);
      for (const action of plan.actions) {
        if (action.type === 'reachTemperature') range(action.temperature, MIN_TEMP, MAX_TEMP, 'Temperature');
        if (action.type === 'air') range(action.durationSeconds, 0.1, 3600, 'Air duration');
      }
    } else {
      const names = new Set(globalVariables.map(({ name }) => name));
      for (const variable of preset.variables || []) {
        if (!variable?.name) throw new Error('Every local variable must have a name');
        if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(variable.name)) throw new Error(`Variable name "${variable.name}" is invalid`);
        if (names.has(variable.name)) throw new Error(`Duplicate variable "${variable.name}"`);
        names.add(variable.name);
      }
      compileAdvancedPreset(preset, globalVariables);
    }
  } catch (error) { errors.push(error.message); }
  return errors;
}

export function validateWorkflow(workflow, presets, globalVariables = []) {
  try {
    const plan = compileWorkflow(workflow, presets, globalVariables);
    if (!plan.stages.length) return ['Workflow must contain at least one preset'];
    return [];
  } catch (error) { return [error.message]; }
}
