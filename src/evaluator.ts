import { BigNumber } from "bignumber.js";
import { Environment } from "./environment";
import { Operator } from "./operator";
import { RPN, RPNItem } from "./parser";
import { Stack } from "./stack";
import { Unit } from "./unit";
import { assertNever } from "./util";
import {
  EmptyValue,
  ErrorValue,
  isEmpty,
  isError,
  isNumeric,
  isUnitless,
  UnitlessNumericValue,
  UnitValue,
  Value,
} from "./value";
import { ValueGenerator } from "./valueGenerator";

type ErrorMessage = string;

export class Evaluator {
  public evaluate(rpn: RPN, env: Environment): Value {
    if (rpn.length() === 0) {
      env.lines.push(new EmptyValue());
      return new EmptyValue();
    }

    const stack: Stack<Value> = new Stack(new ErrorValue("Empty stack"));
    while (rpn.next().type !== "done") {
      const result = this.tryEvaluators(stack, env, rpn.current() as RPNItem);
      if (result !== null) {
        return new ErrorValue(result);
      }
    }

    const final = this.getResultFromStack(stack);
    if (!isError(final)) {
      env.lines.push(final);
    }
    return final;
  }

  private evaluateOperator(stack: Stack<Value>, operator: Operator): ErrorMessage | null {
    const result = operator.operation(stack);
    if (isError(result)) {
      return result.description;
    }
    stack.push(result);
    return null;
  }

  private evaluateAssignment(
    stack: Stack<Value>,
    env: Environment,
    variableName: string,
  ): ErrorMessage | null {
    const varValue = stack.peek();
    if (isNumeric(varValue)) {
      env.variables[variableName] = varValue;
      return null;
    } else {
      return `Top of stack at the point of assignment must be a numeric value, but is ${varValue}.`;
    }
  }

  private evaluateValueGenerator(
    stack: Stack<Value>,
    env: Environment,
    generator: ValueGenerator,
  ): ErrorMessage | null {
    stack.push(generator.operation(env));
    return null;
  }

  private evaluateNumber(stack: Stack<Value>, value: BigNumber): ErrorMessage | null {
    stack.push(new UnitlessNumericValue(value));
    return null;
  }

  private evaluateUnit(stack: Stack<Value>, unit: Unit): ErrorMessage | null {
    const lastVal = stack.peek();
    if (isUnitless(lastVal)) {
      stack.pop();
      const converted = lastVal.convert(new UnitValue(unit));
      if (isError(converted)) {
        return converted.description;
      }
      stack.push(converted);
    } else {
      stack.push(new UnitValue(unit));
    }
    return null;
  }

  private tryEvaluators(
    stack: Stack<Value>,
    env: Environment,
    currentItem: RPNItem,
  ): ErrorMessage | null {
    switch (currentItem.type) {
      case "operator":
        return this.evaluateOperator(stack, currentItem.operator);
      case "assignment":
        return this.evaluateAssignment(stack, env, currentItem.variableName);
      case "valueGenerator":
        return this.evaluateValueGenerator(stack, env, currentItem.generator);
      case "number":
        return this.evaluateNumber(stack, currentItem.value);
      case "unit":
        return this.evaluateUnit(stack, currentItem.unit);
      /* istanbul ignore next */
      default:
        assertNever(currentItem);
        return null;
    }
  }

  private getResultFromStack(stack: Stack<Value>): Value {
    const result = stack.pop();
    if (isNumeric(result) || isEmpty(result)) {
      return result;
    } else {
      return new ErrorValue(
        `Top of stack at the end of RPN evaluation must be a numeric value, but is ${result}.`,
      );
    }
  }
}
