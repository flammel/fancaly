import { BigNumber } from "bignumber.js";
import { convert, getUnit, percent, Unit, unitless } from "./conversion";
import { getOperator, Operator } from "./operator";
import { RPN, RPNItem } from "./parse";
import { Stack } from "./stack";
import { assertNever } from "./util";
import { ValueGenerator } from "./valueGenerator";

BigNumber.config({
  FORMAT: {
    decimalSeparator: ".",
    fractionGroupSeparator: "",
    fractionGroupSize: 0,
    groupSeparator: "",
    groupSize: 0,
    secondaryGroupSize: 0,
  },
});

export interface NumericValue {
  type: "number";
  value: BigNumber;
  unit: Unit;
}
export interface ErrorValue {
  type: "error";
  description: string;
}
export interface UnitValue {
  type: "unit";
  unit: Unit;
}
export type Value = NumericValue | ErrorValue | UnitValue | { type: "empty" };

export function numericValue(value: string | BigNumber, unit: Unit): NumericValue {
  return {
    type: "number",
    unit,
    value: new BigNumber(value),
  };
}

export function isNumericValue(a: any): a is NumericValue {
  return a && a.type === "number";
}

export function errorValue(description: string): ErrorValue {
  return {
    type: "error",
    description,
  };
}

export function stringifyValue(val: Value): string {
  switch (val.type) {
    case "number":
      let str = val.value.dp(4).toFormat();
      if (val.unit !== unitless) {
        str += " " + val.unit.name;
      }
      return str;
    case "unit":
      return val.unit.name;
    case "empty":
      return "";
    case "error":
      return "Error: " + val.description;
    default:
      assertNever(val);
      return "";
  }
}

export interface Environment {
  variables: { [key: string]: Value };
  lines: Value[];
}

export function emptyEnvironment(): Environment {
  return {
    variables: {},
    lines: [],
  };
}

type ErrorMessage = string;

function evaluateOperator(stack: Stack<Value>, operator: Operator): ErrorMessage | null {
  const result = operator.operation(stack);
  if (result.type === "error") {
    return result.description;
  }
  stack.push(result);
  return null;
}

function evaluateAssignment(
  stack: Stack<Value>,
  env: Environment,
  variableName: string,
): ErrorMessage | null {
  const varValue = stack.peek();
  if (isNumericValue(varValue)) {
    env.variables[variableName] = varValue;
    return null;
  } else {
    return `Top of stack at the point of assignment must be a numeric value, but is ${
      varValue ? varValue.type : "undefined"
    }.`;
  }
}

function evaluateValueGenerator(
  stack: Stack<Value>,
  env: Environment,
  generator: ValueGenerator,
): ErrorMessage | null {
  stack.push(generator.operation(env));
  return null;
}

function evaluateNumber(stack: Stack<Value>, value: BigNumber): ErrorMessage | null {
  stack.push(numericValue(value, unitless));
  return null;
}

function evaluateUnit(stack: Stack<Value>, unit: Unit): ErrorMessage | null {
  const lastVal = stack.peek();
  if (isNumericValue(lastVal) && lastVal.unit === unitless) {
    stack.pop();
    stack.push(numericValue(lastVal.value, unit));
  } else {
    stack.push({ type: "unit", unit });
  }
  return null;
}

function tryEvaluators(
  rpn: RPN,
  stack: Stack<Value>,
  env: Environment,
  currentItem: RPNItem,
): ErrorMessage | null {
  switch (currentItem.type) {
    case "operator":
      return evaluateOperator(stack, currentItem.operator);
    case "assignment":
      return evaluateAssignment(stack, env, currentItem.variableName);
    case "valueGenerator":
      return evaluateValueGenerator(stack, env, currentItem.generator);
    case "number":
      return evaluateNumber(stack, currentItem.value);
    case "unit":
      return evaluateUnit(stack, currentItem.unit);
    /* istanbul ignore next */
    default:
      assertNever(currentItem);
      return null;
  }
}

function getResultFromStack(stack: Stack<Value>): Value {
  const result = stack.pop();
  if (result !== undefined && (result.type === "number" || result.type === "empty")) {
    return result;
  } else {
    return errorValue(
      `Top of stack at the end of RPN evaluation must be a numeric value, but is ${
        result ? result.type : "undefined"
      }.`,
    );
  }
}

export function evaluate(rpn: RPN, env: Environment): Value {
  if (rpn.length() === 0) {
    env.lines.push({ type: "empty" });
    return { type: "empty" };
  }

  const stack: Stack<Value> = new Stack();
  while (rpn.next().type !== "done") {
    const result = tryEvaluators(rpn, stack, env, rpn.current() as RPNItem);
    if (result !== null) {
      return errorValue(result);
    }
  }

  const final = getResultFromStack(stack);
  if (final.type !== "error") {
    env.lines.push(final);
  }
  return final;
}
