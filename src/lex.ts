import { unitNames } from "./conversion";
import { List } from "./list";
import { getOperator, operatorNames } from "./operator";
import { aggregatorNames } from "./valueGenerator";

type TokenType =
  | "identifier"
  | "number"
  | "operator"
  | "unit"
  | "("
  | ")"
  | "assignment"
  | "comment"
  | "aggregator"
  | "conversion";

export interface Token {
  type: TokenType;
  value: string;
}

export type Tokens = List<Token>;

export type LexerResult =
  | { type: "success"; tokens: Tokens }
  | { type: "error"; description: string; tokens: Tokens };

function startsWithFollowedBySeparator(haytack: string, needle: string): boolean {
  if (haytack.toLowerCase().indexOf(needle.toLowerCase()) !== 0) {
    return false;
  }
  const remaining = haytack.substr(needle.length);
  return (
    remaining === "" ||
    remaining[0] === " " ||
    remaining[0] === ")" ||
    operatorNames().indexOf(remaining[0]) !== -1
  );
}

function scanComment(input: string): [Token, string] | null {
  if (input[0] === "#") {
    return [
      {
        type: "comment",
        value: input,
      },
      "",
    ];
  }
  return null;
}

function scanParenthesis(input: string): [Token, string] | null {
  const firstChar = input[0];
  if (firstChar === "(" || firstChar === ")") {
    return [
      {
        type: firstChar,
        value: firstChar,
      },
      input.substr(1),
    ];
  }
  return null;
}

function scanAssignment(input: string): [Token, string] | null {
  const firstChar = input[0];
  if (firstChar === ":" || firstChar === "=") {
    return [
      {
        type: "assignment",
        value: firstChar,
      },
      input.substr(1),
    ];
  }
  return null;
}

function scanNumber(input: string): [Token, string] | null {
  const matched = input.match(/^([0-9]+(?:\.[0-9]+)?)\s*(.*)$/);
  if (matched !== null) {
    return [
      {
        type: "number",
        value: matched[1],
      },
      matched[2],
    ];
  }
  return null;
}

function scanOperator(input: string): [Token, string] | null {
  for (const operator of operatorNames()) {
    if (input.indexOf(operator) === 0) {
      return [
        {
          type: "operator",
          value: operator,
        },
        input.substr(operator.length),
      ];
    }
  }
  return null;
}

function scanAggregator(input: string): [Token, string] | null {
  for (const aggregator of aggregatorNames()) {
    if (startsWithFollowedBySeparator(input, aggregator)) {
      return [
        {
          type: "aggregator",
          value: aggregator,
        },
        input.substr(aggregator.length),
      ];
    }
  }
  return null;
}

function scanUnit(input: string): [Token, string] | null {
  for (const unit of unitNames()) {
    if (startsWithFollowedBySeparator(input, unit)) {
      return [
        {
          type: "unit",
          value: unit,
        },
        input.substr(unit.length),
      ];
    }
  }
  return null;
}

function scanIdentifier(input: string): [Token, string] | null {
  // https://stackoverflow.com/questions/20690499
  const matched = input.match(/^([a-zA-Z\u00C0-\u024F_]+)\s*(.*)$/);
  if (matched !== null) {
    return [
      {
        type: "identifier",
        value: matched[1],
      },
      matched[2],
    ];
  }
  return null;
}

function scanConversion(input: string): [Token, string] | null {
  const matched = input.match(/^(to|as)\s+(.*)$/);
  if (matched !== null) {
    return [
      {
        type: "conversion",
        value: matched[1],
      },
      matched[2],
    ];
  }
  return null;
}

function tryScanners(line: string): [Token, string] | null {
  const scanners = [
    scanComment,
    scanAssignment,
    scanParenthesis,
    scanNumber,
    scanOperator,
    scanAggregator,
    scanUnit,
    scanConversion,
    scanIdentifier,
  ];
  for (const scanner of scanners) {
    const result = scanner(line);
    if (result) {
      return result;
    }
  }
  return null;
}

export function lex(line: string): LexerResult {
  const tokens: Token[] = [];

  while (line.trim().length > 0) {
    const result = tryScanners(line.trim());
    if (result) {
      tokens.push(result[0]);
      line = result[1];
    } else {
      return {
        type: "error",
        description: `Cannot lex "${line}"`,
        tokens: new List(tokens),
      };
    }
  }

  return {
    type: "success",
    tokens: new List(tokens),
  };
}
