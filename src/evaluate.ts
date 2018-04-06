import { convert } from "./conversion";
import {
  getOperator,
  isAssignment,
  isOperator,
  isOperatorName,
  Operator,
} from "./operator";
import { RPN, RPNItem } from "./parse";
import { Stack } from "./stack";
import { isUnit, makeUnit, unitless } from "./unit";
import {
  errorValue,
  isNumericValue,
  noValue,
  NumericValue,
  numericValue,
  Value,
} from "./value";

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

/**
 * For exhaustiveness checking.
 */
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

export function evaluate(rpn: RPN, env: Environment): Value {
  if (rpn.length() === 0) {
    env.lines.push(noValue());
    return noValue();
  }

  const stack: Stack<RPNItem> = new Stack();
  while (rpn.next().type !== "done") {
    const curr = rpn.current() as RPNItem;

    if (curr.type === "Operator") {
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
      continue;
    }

    if (curr.type === "assignment") {
      const varValue = stack.peek();
      if (isNumericValue(varValue)) {
        env.variables[curr.value] = varValue;
        continue;
      } else {
        return errorValue(
          `Top of stack at the point of assignment must be a numeric value, but is ${
            varValue ? varValue.type : "undefined"
          }.`,
        );
      }
    }

    if (curr.type === "NumericValue") {
      stack.push(curr);
      continue;
    }

    if (curr.type === "Unit") {
      const lastVal = stack.pop();
      if (isNumericValue(lastVal)) {
        const converted = convert(lastVal, curr);
        if (isNumericValue(converted)) {
          stack.push(converted);
          continue;
        } else {
          return errorValue(
            `Cannot convert ${lastVal.unit.name} to ${curr.name}.`,
          );
        }
      } else {
        return errorValue(
          `Top of stack must be a number when a unit is reached, but is ${
            lastVal ? lastVal.type : "undefined"
          }.`,
        );
      }
    }

    if (curr.type === "ValueGenerator") {
      stack.push(curr.operation(env));
      continue;
    }

    if (curr.type === "Percent") {
      const next = rpn.peek();
      const percentage = stack.pop();
      if (!isNumericValue(percentage)) {
        return errorValue(
          `Top element of stack must be a number when a percentage sign is reached, but is ${
            percentage ? percentage : "undefined"
          }.`,
        );
      }

      if (next.type === "notDone" && isOperator(next.value)) {
        const baseValue = stack.pop();
        if (!isNumericValue(baseValue)) {
          return errorValue(
            `Second element of stack must be a number when a percentage sign is reached with an operator, but is ${
              baseValue ? baseValue : "undefined"
            }.`,
          );
        }
        const oneHundred = numericValue("100", unitless()).value;
        if (next.value.operator === "+") {
          rpn.next();
          stack.push(
            numericValue(
              baseValue.value
                .dividedBy(100)
                .multipliedBy(percentage.value.plus(oneHundred)),
              percentage.unit,
            ),
          );
        }
        if (next.value.operator === "-") {
          rpn.next();
          stack.push(
            numericValue(
              baseValue.value
                .dividedBy(100)
                .multipliedBy(oneHundred.minus(percentage.value)),
              percentage.unit,
            ),
          );
        }
        if (next.value.operator === "*") {
          rpn.next();
          stack.push(
            numericValue(
              baseValue.value.dividedBy(100).multipliedBy(percentage.value),
              percentage.unit,
            ),
          );
        }
        if (next.value.operator === "/") {
          rpn.next();
          stack.push(
            numericValue(
              baseValue.value.dividedBy(percentage.value.dividedBy(100)),
              percentage.unit,
            ),
          );
        }
        continue;
      }

      const converted = convert(percentage, makeUnit("%"));
      if (isNumericValue(converted)) {
        stack.push(converted);
        continue;
      } else {
        return errorValue(`Cannot convert ${percentage.unit.name} to %.`);
      }
    }

    if (curr.type === "ErrorValue" || curr.type === "NoValue") {
      continue;
    }

    assertNever(curr);
  }

  const result = stack.pop();
  if (
    result !== undefined &&
    (result.type === "NumericValue" || result.type === "NoValue")
  ) {
    env.lines.push(result);
    return result;
  } else {
    return errorValue(
      `Top of stack at the end of RPN evaluation must be a numeric value, but is ${
        result ? result.type : "undefined"
      }.`,
    );
  }
}
