const TOKEN_RE = /\s*(?:(\d+(?:\.\d+)?)|([A-Za-z_][A-Za-z0-9_]*)|(.))/y;

function tokenize(source) {
  source = source.trim();
  const tokens = [];
  TOKEN_RE.lastIndex = 0;
  while (TOKEN_RE.lastIndex < source.length) {
    const match = TOKEN_RE.exec(source);
    if (!match) throw new Error(`Invalid expression near character ${TOKEN_RE.lastIndex + 1}`);
    if (match[1]) tokens.push({ type: 'number', value: Number(match[1]) });
    else if (match[2]) tokens.push({ type: 'identifier', value: match[2] });
    else if ('+-*/()'.includes(match[3])) tokens.push({ type: match[3], value: match[3] });
    else throw new Error(`Unsupported character "${match[3]}"`);
  }
  tokens.push({ type: 'eof' });
  return tokens;
}

function combineTypes(left, right, operator) {
  if (operator === '+' || operator === '-') {
    if (left === right) return left;
    if (left === 'scalar') return right;
    if (right === 'scalar') return left;
    throw new Error(`Cannot ${operator === '+' ? 'add' : 'subtract'} ${left} and ${right}`);
  }
  if (operator === '*') {
    if (left !== 'scalar' && right !== 'scalar') {
      throw new Error(`Cannot multiply ${left} by ${right}`);
    }
    return left === 'scalar' ? right : left;
  }
  if (right === 'scalar') return left;
  if (left === right) return 'scalar';
  throw new Error(`Cannot divide ${left} by ${right}`);
}

/** Parse and evaluate the deliberately small arithmetic language. */
export function evaluateExpression(source, resolveVariable) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Expression is empty');
  const tokens = tokenize(source);
  let index = 0;
  const current = () => tokens[index];
  const take = (type) => {
    if (current().type !== type) throw new Error(`Expected ${type}`);
    return tokens[index++];
  };

  const primary = () => {
    if (current().type === 'number') return { value: take('number').value, valueType: 'scalar' };
    if (current().type === 'identifier') {
      const name = take('identifier').value;
      const resolved = resolveVariable(name);
      if (!resolved) throw new Error(`Unknown variable "${name}"`);
      return resolved;
    }
    if (current().type === '(') {
      take('(');
      const result = addition();
      take(')');
      return result;
    }
    if (current().type === '+' || current().type === '-') {
      const sign = take(current().type).type === '-' ? -1 : 1;
      const result = primary();
      return { ...result, value: result.value * sign };
    }
    throw new Error('Expected a number, variable, or parenthesized expression');
  };

  const multiplication = () => {
    let left = primary();
    while (current().type === '*' || current().type === '/') {
      const operator = take(current().type).type;
      const right = primary();
      if (operator === '/' && right.value === 0) throw new Error('Division by zero');
      left = {
        value: operator === '*' ? left.value * right.value : left.value / right.value,
        valueType: combineTypes(left.valueType, right.valueType, operator),
      };
    }
    return left;
  };

  const addition = () => {
    let left = multiplication();
    while (current().type === '+' || current().type === '-') {
      const operator = take(current().type).type;
      const right = multiplication();
      left = {
        value: operator === '+' ? left.value + right.value : left.value - right.value,
        valueType: combineTypes(left.valueType, right.valueType, operator),
      };
    }
    return left;
  };

  const result = addition();
  if (current().type !== 'eof') throw new Error(`Unexpected token "${current().value}"`);
  if (!Number.isFinite(result.value)) throw new Error('Expression result is not finite');
  return result;
}

export function evaluateBinding(binding, expectedType, context) {
  if (!binding || binding.mode === 'literal') {
    const value = Number(binding?.value);
    if (!Number.isFinite(value)) throw new Error('A finite numeric value is required');
    return value;
  }
  if (binding.mode !== 'expression') throw new Error(`Unknown binding mode "${binding.mode}"`);
  const result = evaluateExpression(binding.expression, context.resolve);
  if (result.valueType !== expectedType && result.valueType !== 'scalar') {
    throw new Error(`Expected ${expectedType}, got ${result.valueType}`);
  }
  return result.value;
}

export function createVariableContext(globalVariables = [], localVariables = [], builtins = {}) {
  const definitions = new Map();
  for (const variable of [...globalVariables, ...localVariables]) {
    if (!variable?.name) continue;
    if (definitions.has(variable.name)) throw new Error(`Duplicate variable "${variable.name}"`);
    definitions.set(variable.name, variable);
  }
  const resolved = new Map(Object.entries(builtins).map(([name, item]) => [name, item]));
  const resolving = new Set();

  const resolve = (name) => {
    if (resolved.has(name)) return resolved.get(name);
    const variable = definitions.get(name);
    if (!variable) return null;
    if (resolving.has(name)) throw new Error(`Variable dependency cycle at "${name}"`);
    resolving.add(name);
    try {
      const binding = variable.binding || { mode: 'literal', value: variable.value };
      const value = evaluateBinding(binding, variable.valueType || 'scalar', { resolve });
      const result = { value, valueType: variable.valueType || 'scalar' };
      resolved.set(name, result);
      return result;
    } finally {
      resolving.delete(name);
    }
  };

  for (const name of definitions.keys()) resolve(name);
  return { resolve };
}
