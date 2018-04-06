import { Token, Tokens } from "./lex";
import { List } from "./list";
import {
  Assignment,
  getAggregator,
  getOperator,
  isAssignment,
  isOperator,
  isOperatorName,
  makeAssignment,
  makePercent,
  makeReadVariable,
  Operator,
  Percent,
  ValueGenerator,
} from "./operator";
import { Stack } from "./stack";
import { isUnit, isUnitName, makeUnit, Unit, unitless, units } from "./unit";
import { errorValue, numericValue, Value } from "./value";

export type ParserResult =
  | { type: "success"; rpn: RPN }
  | { type: "error"; description: string; rpn: RPN };

export type RPNItem =
  | Value
  | Operator
  | Unit
  | Assignment
  | ValueGenerator
  | Percent;
export type RPN = List<RPNItem>;

type StackItem = Operator | LeftBracketOnStack | Assignment;
interface LeftBracketOnStack {
  type: "(";
}
const leftBracketOnStack: LeftBracketOnStack = { type: "(" };

/**
 * For exhaustiveness checking.
 */
function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

/**
 * https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
 */
function shuntingYardOperator(
  token: Token,
  stack: Stack<StackItem>,
  queue: RPNItem[],
) {
  const operator = getOperator(token.value);
  let stackTop = stack.peek();
  while (
    isOperator(stackTop) &&
    (stackTop.precedence > operator.precedence ||
      (stackTop.precedence === operator.precedence &&
        stackTop.associativity === "left"))
  ) {
    stack.pop();
    queue.push(stackTop);
    stackTop = stack.peek();
  }
  stack.push(operator);
}

export function parse(tokens: Tokens): ParserResult {
  const stack: Stack<StackItem> = new Stack();
  const queue: RPNItem[] = [];

  while (tokens.next().type !== "done") {
    const cur = tokens.current() as Token;

    if (cur.name === "number") {
      queue.push(numericValue(cur.value, unitless()));
      continue;
    }

    if (cur.name === "operator") {
      shuntingYardOperator(cur, stack, queue);
      continue;
    }

    if (cur.name === "(") {
      stack.push(leftBracketOnStack);
      continue;
    }

    if (cur.name === ")") {
      while (isOperator(stack.peek())) {
        queue.push(stack.pop() as Operator);
      }
      if (stack.peek() !== leftBracketOnStack) {
        return {
          type: "error",
          description: 'Unbalanced parens in ")" loop.',
          rpn: new List(queue),
        };
      }
      stack.pop();
      continue;
    }

    if (cur.name === "identifier") {
      const peeked = tokens.peek();
      if (peeked.type === "notDone" && peeked.value.name === "assignment") {
        stack.push(makeAssignment(cur.value));
        tokens.next();
      } else {
        queue.push(makeReadVariable(cur.value));
      }
      continue;
    }

    if (cur.name === "unit") {
      if (isUnitName(cur.value)) {
        queue.push(makeUnit(cur.value));
        continue;
      } else {
        return {
          type: "error",
          description: 'Unknown unit "' + cur.value + '".',
          rpn: new List(queue),
        };
      }
    }

    if (cur.name === "percent") {
      queue.push(makePercent());
      continue;
    }

    if (cur.name === "assignment") {
      return {
        type: "error",
        description: "Assignment operators are only allowed after identifiers.",
        rpn: new List(queue),
      };
    }

    if (cur.name === "comment") {
      // ignore comments
      continue;
    }

    if (cur.name === "aggregator") {
      queue.push(getAggregator(cur.value));
      continue;
    }

    assertNever(cur.name);
  }

  while (stack.peek() !== undefined) {
    const stackTop = stack.pop();
    if (isOperator(stackTop) || isAssignment(stackTop)) {
      queue.push(stackTop);
    } else {
      return {
        type: "error",
        description: "Unbalanced parens in final loop.",
        rpn: new List(queue),
      };
    }
  }

  return { type: "success", rpn: new List(queue) };
}
