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
export type Value = NumericValue | ErrorValue | { type: "empty" };

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

function evaluateOperator(
  rpn: RPN,
  stack: Stack<Value>,
  env: Environment,
  operator: Operator,
): ErrorMessage | null {
  const rgtOperand = stack.pop();
  const lftOperand = stack.pop();
  if (!isNumericValue(lftOperand) || !isNumericValue(rgtOperand)) {
    return `Operands of "${operator.operator}" must be numeric values but are ${
      lftOperand ? lftOperand.type : "undefined"
    } and ${rgtOperand ? rgtOperand.type : "undefined"}.`;
  }

  if (lftOperand.unit !== percent && rgtOperand.unit === percent) {
    return evaluateOperatorOnPercentage(stack, operator, lftOperand, rgtOperand);
  }

  const convertedRgt = convert(rgtOperand, lftOperand.unit);
  if (!isNumericValue(convertedRgt)) {
    return `Could not convert ${rgtOperand.unit.name} in rgt operand to unit ${
      lftOperand.unit.name
    } of lft operand`;
  }

  stack.push(operator.operation(lftOperand, convertedRgt));
  return null;
}

function evaluateOperatorOnPercentage(
  stack: Stack<Value>,
  operator: Operator,
  baseValue: NumericValue,
  percentage: NumericValue,
): ErrorMessage | null {
  switch (operator.operator) {
    case "*":
      stack.push(
        numericValue(baseValue.value.dividedBy(100).multipliedBy(percentage.value), baseValue.unit),
      );
      return null;
    case "+":
      stack.push(
        numericValue(
          baseValue.value.dividedBy(100).multipliedBy(percentage.value.plus(new BigNumber(100))),
          baseValue.unit,
        ),
      );
      return null;
    case "/":
      stack.push(
        numericValue(baseValue.value.dividedBy(percentage.value.dividedBy(100)), baseValue.unit),
      );
      return null;
    case "-":
      stack.push(
        numericValue(
          baseValue.value.dividedBy(100).multipliedBy(new BigNumber(100).minus(percentage.value)),
          baseValue.unit,
        ),
      );
      return null;
    default:
      return "Cannot use operation " + operator.operator + " with percentages";
  }
}

function evaluateAssignment(
  rpn: RPN,
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
  rpn: RPN,
  stack: Stack<Value>,
  env: Environment,
  generator: ValueGenerator,
): ErrorMessage | null {
  stack.push(generator.operation(env));
  return null;
}

function evaluateNumber(
  rpn: RPN,
  stack: Stack<Value>,
  env: Environment,
  value: BigNumber,
): ErrorMessage | null {
  stack.push(numericValue(value, unitless));
  return null;
}

function evaluateUnit(
  rpn: RPN,
  stack: Stack<Value>,
  env: Environment,
  unit: Unit,
): ErrorMessage | null {
  const lastVal = stack.pop();
  if (!isNumericValue(lastVal)) {
    return `Top of stack must be a number when a unit is reached, but is ${
      lastVal ? lastVal.type : "undefined"
    }.`;
  }

  const converted = convert(lastVal, unit);
  if (!isNumericValue(converted)) {
    return `Cannot convert ${lastVal.unit.name} to ${unit.name}.`;
  }

  stack.push(converted);
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
      return evaluateOperator(rpn, stack, env, currentItem.operator);
    case "assignment":
      return evaluateAssignment(rpn, stack, env, currentItem.variableName);
    case "valueGenerator":
      return evaluateValueGenerator(rpn, stack, env, currentItem.generator);
    case "number":
      return evaluateNumber(rpn, stack, env, currentItem.value);
    case "unit":
      return evaluateUnit(rpn, stack, env, currentItem.unit);
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
