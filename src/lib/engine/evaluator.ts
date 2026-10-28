/**
 * SQL Expression Evaluator for SKY WINGS Browser Engine
 * Evaluates binary expressions, comparisons, functions, and pattern matching.
 */

import { Expression, FunctionCallExpression } from './ast';

export function evaluateExpression(expr: Expression, row: Record<string, any>): any {
  switch (expr.type) {
    case 'LITERAL':
      return expr.value;

    case 'IDENTIFIER': {
      const name = expr.name;
      const lowerName = name.toLowerCase();

      // If table prefix is provided, ALWAYS prioritize table.column
      if (expr.table) {
        const fullKey = `${expr.table}.${name}`;
        if (fullKey in row) return row[fullKey];
        const lowerFullKey = fullKey.toLowerCase();
        for (const k of Object.keys(row)) {
          if (k.toLowerCase() === lowerFullKey) return row[k];
        }

        // Also check alias mappings like fare/price with table prefix
        if (lowerName === 'fare') {
          const priceKey = `${expr.table}.price`;
          if (priceKey in row) return row[priceKey];
          for (const k of Object.keys(row)) {
            if (k.toLowerCase() === priceKey.toLowerCase()) return row[k];
          }
        }
        if (lowerName === 'price') {
          const fareKey = `${expr.table}.fare`;
          if (fareKey in row) return row[fareKey];
          for (const k of Object.keys(row)) {
            if (k.toLowerCase() === fareKey.toLowerCase()) return row[k];
          }
        }
      }

      // Exact bare match
      if (name in row) return row[name];

      // Lowercase match
      for (const k of Object.keys(row)) {
        if (k.toLowerCase() === lowerName) {
          return row[k];
        }
      }

      // Aliases support: fare <-> price
      if (lowerName === 'fare') {
        return row['price'] !== undefined ? row['price'] : row['fare'];
      }
      if (lowerName === 'price') {
        return row['fare'] !== undefined ? row['fare'] : row['price'];
      }

      return null;
    }

    case 'UNARY': {
      const val = evaluateExpression(expr.argument, row);
      if (expr.operator === 'NOT') {
        return !Boolean(val);
      }
      if (expr.operator === '-') {
        return -Number(val);
      }
      return val;
    }

    case 'BINARY': {
      const left = evaluateExpression(expr.left, row);
      const right = evaluateExpression(expr.right, row);

      switch (expr.operator) {
        case 'AND':
          return Boolean(left) && Boolean(right);
        case 'OR':
          return Boolean(left) || Boolean(right);
        case '=':
          return left == right;
        case '!=':
        case '<>':
          return left != right;
        case '<':
          return Number(left) < Number(right);
        case '<=':
          return Number(left) <= Number(right);
        case '>':
          return Number(left) > Number(right);
        case '>=':
          return Number(left) >= Number(right);
        case '+':
          return typeof left === 'string' || typeof right === 'string' ? `${left}${right}` : Number(left) + Number(right);
        case '-':
          return Number(left) - Number(right);
        case '*':
          return Number(left) * Number(right);
        case '/':
          return Number(right) === 0 ? null : Number(left) / Number(right);
        default:
          return false;
      }
    }

    case 'LIKE': {
      const val = String(evaluateExpression(expr.expression, row) ?? '');
      const pattern = String(evaluateExpression(expr.pattern, row) ?? '');

      // Convert SQL LIKE pattern (% and _) into Regex
      const regexPattern = '^' + pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/%/g, '.*')
        .replace(/_/g, '.') + '$';

      const match = new RegExp(regexPattern, 'i').test(val);
      return expr.isNot ? !match : match;
    }

    case 'BETWEEN': {
      const val = Number(evaluateExpression(expr.expression, row));
      const lower = Number(evaluateExpression(expr.lower, row));
      const upper = Number(evaluateExpression(expr.upper, row));

      const inRange = val >= lower && val <= upper;
      return expr.isNot ? !inRange : inRange;
    }

    case 'IN': {
      const val = evaluateExpression(expr.expression, row);
      const list = expr.values.map((v) => evaluateExpression(v, row));
      const inList = list.some((item) => item == val);
      return expr.isNot ? !inList : inList;
    }

    case 'IS_NULL': {
      const val = evaluateExpression(expr.expression, row);
      const isNull = val === null || val === undefined;
      return expr.isNot ? !isNull : isNull;
    }

    case 'FUNCTION_CALL': {
      // Aggregates like COUNT, SUM, AVG, MIN, MAX when evaluated individually on a pre-computed group
      const key = formatFunctionKey(expr);
      if (key in row) {
        return row[key];
      }
      return null;
    }

    case 'STAR':
      return '*';

    default:
      return null;
  }
}

export function formatFunctionKey(fn: FunctionCallExpression): string {
  const arg = fn.arguments[0];
  const argStr = arg ? (arg.type === 'STAR' ? '*' : (arg as any).name || 'expr') : '';
  const distinct = fn.isDistinct ? 'DISTINCT ' : '';
  return `${fn.name.toUpperCase()}(${distinct}${argStr})`;
}
