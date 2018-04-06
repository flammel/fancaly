import { BigNumber } from "bignumber.js";
import { convert } from "./conversion";
import { getOperator, isOperator, isOperatorName, Operator } from "./operator";
import { isUnit, Unit, unitless, units } from "./unit";
import {
  errorValue,
  isNumericValue,
  noValue,
  NumericValue,
  numericValue,
  Value,
} from "./value";
import { analyse, Token } from './lexer';

interface Environment {
  variables: { [key: string]: Value };
  lines: Value[];
}

type RPNItem = Value | Operator | Unit;
type RPN = RPNItem[];

function evalRPN(rpn: RPN): Value {
  const stack: RPNItem[] = [];
  for (const curr of rpn) {
    if (isOperator(curr)) {
      const rgtOperand = stack.pop();
      const lftOperand = stack.pop();
      if (!isNumericValue(lftOperand) || !isNumericValue(rgtOperand)) {
        return errorValue(
          `Operands of "${curr.operator}" must be numeric values but are ${
            lftOperand ? lftOperand.type : "undefined"
          } and ${rgtOperand ? rgtOperand.type : "undefined"}.`,
        );
      }
      const convertedRgt = convert(rgtOperand, lftOperand.unit);
      if (!isNumericValue(convertedRgt)) {
        return errorValue(
          `Could not convert ${rgtOperand.unit.name} in rgt operand to unit ${
            lftOperand.unit.name
          } of lft operand`,
        );
      }
      stack.push(curr.operation(lftOperand, convertedRgt));
    } else if (isUnit(curr)) {
      const stackTop = stack.pop();
      if (isNumericValue(stackTop)) {
        stack.push(convert(stackTop, curr));
      }
    } else {
      stack.push(curr);
    }
  }
  const result = stack.pop();
  if (isNumericValue(result)) {
    return result;
  } else {
    return errorValue(
      `Top of stack at the end of RPN evaluation must be a numeric value, but is ${
        result ? result.type : "undefined"
      }.`,
    );
  }
}

function parseNumber(chars: string[]): [BigNumber, number] {
  let idxForward = 0;
  let result = "";
  for (const char of chars) {
    if (char.match(/^[0-9]$/)) {
      result += char;
    } else if (char === ".") {
      result += char;
    } else if (char.match(/^\s$/)) {
      // ignore
    } else if (char === ",") {
      // ignore
    } else {
      break;
    }
    idxForward++;
  }
  return [new BigNumber(result), idxForward - 1];
}

function parseUnit(chars: string[]): [Unit | null, number] {
  const prefix = chars.join("").slice(0, 10);
  for (const unit of units) {
    if (prefix.indexOf(unit.name) === 0) {
      return [unit, unit.name.length];
    }
  }
  return [null, 0];
}

function parseVariable(
  chars: string[],
  env: Environment,
): [Value | null, number] {
  let potentialVar = "";
  let varIdx = 0;
  while (
    typeof chars[varIdx] === "string" &&
    chars[varIdx].match(/^[a-zA-Z_]$/)
  ) {
    potentialVar += chars[varIdx];
    varIdx++;
  }
  if (potentialVar !== "" && potentialVar in env.variables) {
    return [env.variables[potentialVar], varIdx - 1];
  }
  return [null, 0];
}

function shuntingYard(chars: string[], env: Environment): RPN {
  const stack: string[] = [];
  const queue: RPNItem[] = [];
  for (let idx = 0; idx < chars.length; idx++) {
    const curr = chars[idx];

    if (curr.match(/^[0-9]$/)) {
      const [num, idxForward] = parseNumber(chars.slice(idx));
      queue.push(numericValue(num, unitless()));
      idx = idx + idxForward;
      continue;
    }

    if (curr.match(/^\s$/)) {
      continue;
    }

    if (isOperatorName(curr)) {
      let stackTop = stack[stack.length - 1];
      const currOp = getOperator(curr);
      let stkOp = getOperator(stackTop);
      while (
        typeof stackTop === "string" &&
        stackTop !== "(" &&
        (stkOp.precedence > currOp.precedence ||
          (stkOp.precedence === currOp.precedence &&
            stkOp.associativity === "left"))
      ) {
        queue.push(stkOp);
        stack.pop();
        stackTop = stack[stack.length - 1];
        stkOp = getOperator(stackTop);
      }
      stack.push(curr);
      continue;
    }

    if (curr === "(") {
      stack.push("(");
      continue;
    }

    if (curr === ")") {
      let popped = stack.pop();
      while (popped && isOperatorName(popped)) {
        queue.push(getOperator(popped));
        popped = stack.pop();
      }
      if (popped === undefined) {
        // unbalanced parens
        return [errorValue('Unbalanced parens in ")" loop.')];
      }
      continue;
    }

    const [unit, idxForwardUnit] = parseUnit(chars.slice(idx));
    if (unit) {
      let stackTop = stack[stack.length - 1];
      const currOp = getOperator(curr);
      let stkOp = getOperator(stackTop);
      while (typeof stackTop === "string" && stackTop !== "(") {
        queue.push(stkOp);
        stack.pop();
        stackTop = stack[stack.length - 1];
        stkOp = getOperator(stackTop);
      }
      queue.push(unit);
      idx = idx + idxForwardUnit;
      continue;
    }

    const [variableValue, idxForwardVariable] = parseVariable(
      chars.slice(idx),
      env,
    );
    if (variableValue) {
      queue.push(variableValue);
      idx = idx + idxForwardVariable;
      continue;
    }
  }

  for (const op of stack.reverse()) {
    if (isOperatorName(op)) {
      queue.push(getOperator(op));
    } else {
      // unbalanced parens
      return [errorValue("Unbalanced parens in final loop.")];
    }
  }
  return queue;
}

type ParserResult = 
  | { type: 'success'; rpn: RPN }
  | { type: 'error'; description: string }

function parse(tokens: Token[], env: Environment): [ParserResult, Environment] {
  const stack: Token[] = [];
  const queue: RPNItem[] = [];
  for (let idx = 0; idx < tokens.length; idx++) {
    const token = tokens[idx];
    if (token.name === 'number') {
      queue.push(numericValue(new BigNumber(token.value), unitless()));
      continue;
    }

    if (isOperatorName(curr)) {
      let stackTop = stack[stack.length - 1];
      const currOp = getOperator(curr);
      let stkOp = getOperator(stackTop);
      while (
        typeof stackTop === "string" &&
        stackTop !== "(" &&
        (stkOp.precedence > currOp.precedence ||
          (stkOp.precedence === currOp.precedence &&
            stkOp.associativity === "left"))
      ) {
        queue.push(stkOp);
        stack.pop();
        stackTop = stack[stack.length - 1];
        stkOp = getOperator(stackTop);
      }
      stack.push(curr);
      continue;
    }

    if (token.name === 'operator') {
      continue;
    }

    if (token.name === '(') {
      stack.push(token);
      continue;
    }

    if (token.name === ")") {
      let popped = stack.pop();
      while (popped && isOperatorName(popped)) {
        queue.push(getOperator(popped));
        popped = stack.pop();
      }
      if (popped === undefined) {
        return [{type: 'error', description: 'Unbalanced parens in ")" loop.'}, env];
      }
      continue;
    }
  }

    const [unit, idxForwardUnit] = parseUnit(chars.slice(idx));
    if (unit) {
      let stackTop = stack[stack.length - 1];
      const currOp = getOperator(curr);
      let stkOp = getOperator(stackTop);
      while (typeof stackTop === "string" && stackTop !== "(") {
        queue.push(stkOp);
        stack.pop();
        stackTop = stack[stack.length - 1];
        stkOp = getOperator(stackTop);
      }
      queue.push(unit);
      idx = idx + idxForwardUnit;
      continue;
    }

    const [variableValue, idxForwardVariable] = parseVariable(
      chars.slice(idx),
      env,
    );
    if (variableValue) {
      queue.push(variableValue);
      idx = idx + idxForwardVariable;
      continue;
    }
  }

  for (const op of stack.reverse()) {
    if (isOperatorName(op)) {
      queue.push(getOperator(op));
    } else {
      return [{type: 'error', description: 'Unbalanced parens in final loop.'}, env];
    }
  }
  return queue;
}

function evaluate(rpn: RPN, env: Environment): [Value, Environment] {
  return [noValue(), env];
}

export function interpret(input: string[]): Value[] {
  let environment: Environment = { variables: {}, lines: [] };
  for (const line of input) {
    let parsed, env, val;
    const lexed = analyse(line);
    if (lexed.type === 'error') {
      environment.lines.push(errorValue(lexed.description));
      continue;
    } else {
      [parsed, env] = parse(lexed.tokens, environment)
      if (parsed.type === 'error') {
        environment.lines.push(errorValue(parsed.description));
        continue;
      } else {
        [val, env] = evaluate(parsed.rpn, environment);
        env.lines.push(val);
        environment = env;
      }
    }
  }
  return environment.lines;
}
