import { BigNumber } from "bignumber.js";
import {
  Value,
  NumericValue,
  isNumericValue,
  noValue,
  errorValue,
  numericValue,
} from "./value";
import { isOperator, Operator, isOperatorName, getOperator } from "./operator";
import { units, Unit, isUnit, unitless } from "./unit";
import { convert } from "./conversion";

type Environment = {
  variables: { [key: string]: Value };
  lines: Value[];
};

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
      let currOp = getOperator(curr);
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
      let currOp = getOperator(curr);
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

function interpretLine(line: string, env: Environment): [Value, Environment] {
  // Ignore lines that start with `#`.
  if (line.indexOf("#") === 0) {
    return [noValue(), env];
  }

  // If the line is a variable definition, then extract the variable name
  // and continue with `line` containing the part of the line after the
  // `varName :/=` part.
  let varName = null;
  const matchResult = line.match(/^([a-zA-Z_]+)\s*(?::|=)\s*(.*)$/);
  if (matchResult !== null) {
    varName = matchResult[1];
    line = matchResult[2];
  }

  // Run the parser and evaluate the expression.
  const rpn = shuntingYard(line.split(""), env);
  const result = evalRPN(rpn);

  // If the line defined a variable, add the variable to the environment.
  if (varName !== null && result !== null) {
    env.variables[varName] = result;
  }

  // Return the value of the given line and the updated environment.
  return [result, env];
}

export function interpret(input: string[]): Value[] {
  let environment: Environment = { variables: {}, lines: [] };
  const result = [];
  for (const line of input) {
    const [str, env] = interpretLine(line, environment);
    env.lines.push(str);
    result.push(str);
    environment = env;
  }
  return result;
}
