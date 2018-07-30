import { BigNumber } from "bignumber.js";
import { getUnit, Unit } from "./conversion";
import { Token, Tokens } from "./lex";
import { List } from "./list";
import { getOperator, Operator } from "./operator";
import { Stack } from "./stack";
import { assertNever } from "./util";
import { getAggregator, makeReadVariable, ValueGenerator } from "./valueGenerator";

export type ParserResult =
  | { type: "success"; rpn: RPN }
  | { type: "error"; description: string; rpn: RPN };

export type RPNItem =
  | { type: "operator"; operator: Operator }
  | { type: "assignment"; variableName: string }
  | { type: "number"; value: BigNumber }
  | { type: "unit"; unit: Unit }
  | { type: "valueGenerator"; generator: ValueGenerator }
  | { type: "conversion"; unit: Unit };

export type RPN = List<RPNItem>;

type StackItem =
  | { type: "(" }
  | { type: "operator"; operator: Operator }
  | { type: "assignment"; variableName: string };

interface ParserState {
  tokens: Tokens;
  stack: Stack<StackItem>;
  queue: RPNItem[];
  nextMinus: "-" | "-u";
}

type ErrorMessage = string;

function parseNumber(state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-";
  state.queue.push({
    type: "number",
    value: new BigNumber(value),
  });
  return null;
}

function parseOperator(state: ParserState, value: string): ErrorMessage | null {
  // https://en.wikipedia.org/wiki/Shunting-yard_algorithm#The_algorithm_in_detail
  const operatorSymbol = value === "-" ? state.nextMinus : value;
  const operator = getOperator(operatorSymbol);

  if (operator === undefined) {
    return "Unknown operator " + operatorSymbol;
  }

  state.nextMinus = "-u";
  let stackTop = state.stack.peek();
  while (
    stackTop !== undefined &&
    stackTop.type === "operator" &&
    (stackTop.operator.precedence > operator.precedence ||
      (stackTop.operator.precedence === operator.precedence &&
        stackTop.operator.associativity === "left"))
  ) {
    state.stack.pop();
    state.queue.push(stackTop);
    stackTop = state.stack.peek();
  }
  state.stack.push({
    type: "operator",
    operator,
  });
  return null;
}

function parseLeftBracket(state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-u";
  state.stack.push({ type: "(" });
  return null;
}

function parseRightBracket(state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-";
  let stackTop = state.stack.peek();
  while (stackTop && stackTop.type === "operator") {
    state.queue.push(stackTop);
    state.stack.pop();
    stackTop = state.stack.peek();
  }
  if (stackTop === undefined || stackTop.type !== "(") {
    return 'Unbalanced parens in ")" loop.';
  }
  state.stack.pop();
  return null;
}

function parseIdentifier(state: ParserState, value: string): ErrorMessage | null {
  const peeked = state.tokens.peek();
  if (peeked.type === "notDone" && peeked.value.type === "assignment") {
    state.nextMinus = "-u";
    state.stack.push({
      type: "assignment",
      variableName: value,
    });
    state.tokens.next();
  } else {
    state.nextMinus = "-";
    state.queue.push({
      type: "valueGenerator",
      generator: makeReadVariable(value),
    });
  }
  return null;
}

function parseUnit(state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-";
  const unit = getUnit(value);
  if (unit === undefined) {
    return 'Unknown unit "' + value + '".';
  }
  state.queue.push({
    type: "unit",
    unit,
  });
  return null;
}

function parseAssignment(state: ParserState, value: string): ErrorMessage | null {
  return "Assignment operators are only allowed after identifiers.";
}

function parseComment(state: ParserState, value: string): ErrorMessage | null {
  return null;
}

function parseAggregator(state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-";
  const aggregator = getAggregator(value);
  if (aggregator === undefined) {
    return 'Unknown aggregator "' + value + '".';
  }
  state.queue.push({
    type: "valueGenerator",
    generator: aggregator,
  });
  return null;
}

function parseConversion(state: ParserState, value: string): ErrorMessage | null {
  state.nextMinus = "-";
  const peeked = state.tokens.peek();

  if (peeked.type === "done") {
    return 'Conversion "' + value + '" must not be followed by end of input';
  }

  if (peeked.value.type !== "unit") {
    return (
      'Conversion "' +
      value +
      '" must be followed by unit, but is followed by ' +
      JSON.stringify(peeked.value)
    );
  }

  const unit = getUnit(peeked.value.value);
  if (unit === undefined) {
    return 'Unknown unit "' + value + '".';
  }
  state.tokens.next();

  let stackTop = state.stack.peek();
  while (stackTop !== undefined && stackTop.type === "operator") {
    state.stack.pop();
    state.queue.push(stackTop);
    stackTop = state.stack.peek();
  }

  state.queue.push({
    type: "conversion",
    unit,
  });
  return null;
}

function tryParsers(state: ParserState, currentToken: Token): ErrorMessage | null {
  switch (currentToken.type) {
    case "number":
      return parseNumber(state, currentToken.value);
    case "operator":
      return parseOperator(state, currentToken.value);
    case "(":
      return parseLeftBracket(state, currentToken.value);
    case ")":
      return parseRightBracket(state, currentToken.value);
    case "identifier":
      return parseIdentifier(state, currentToken.value);
    case "unit":
      return parseUnit(state, currentToken.value);
    case "assignment":
      return parseAssignment(state, currentToken.value);
    case "comment":
      return parseComment(state, currentToken.value);
    case "aggregator":
      return parseAggregator(state, currentToken.value);
    case "conversion":
      return parseConversion(state, currentToken.value);
    default:
      assertNever(currentToken.type);
      return null;
  }
}

function parseRemainingStack(state: ParserState): ParserResult {
  let stackTop = state.stack.peek();
  while (stackTop !== undefined) {
    state.stack.pop();
    if (stackTop.type === "operator" || stackTop.type === "assignment") {
      state.queue.push(stackTop);
    } else {
      return {
        type: "error",
        description: "Unbalanced parens in final loop.",
        rpn: new List(state.queue),
      };
    }
    stackTop = state.stack.peek();
  }

  return { type: "success", rpn: new List(state.queue) };
}

export function parse(tokens: Tokens): ParserResult {
  const state: ParserState = {
    tokens,
    stack: new Stack(),
    queue: [],
    nextMinus: "-u",
  };

  while (state.tokens.next().type !== "done") {
    const result = tryParsers(state, state.tokens.current() as Token);
    if (result !== null) {
      return {
        type: "error",
        description: result,
        rpn: new List(state.queue),
      };
    }
  }
  return parseRemainingStack(state);
}
