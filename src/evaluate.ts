import {
  getOperator,
  isAssignment,
  isOperator,
  isOperatorName,
  Operator,
} from "./operator";
import { RPN, RPNItem } from "./parse";
import { Stack } from "./stack";
import { isUnit } from "./unit";
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
  if (rpn.length === 0) {
    env.lines.push(noValue());
    return noValue();
  }

  const stack: Stack<RPNItem> = new Stack();
  for (const curr of rpn) {
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
      // const convertedRgt = convert(rgtOperand, lftOperand.unit);
      // if (!isNumericValue(convertedRgt)) {
      //   return errorValue(
      //     `Could not convert ${rgtOperand.unit.name} in rgt operand to unit ${
      //       lftOperand.unit.name
      //     } of lft operand`,
      //   );
      // }
      // stack.push(curr.operation(lftOperand, convertedRgt));
      stack.push(curr.operation(lftOperand, rgtOperand));
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
      continue;
    }

    if (curr.type === "ValueGenerator") {
      stack.push(curr.operation(env));
      continue;
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
