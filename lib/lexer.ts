import { Formatter } from "./formatter";
import { List } from "./list";

type TokenType =
  | "identifier"
  | "number"
  | "operator"
  | "function"
  | "unit"
  | "("
  | ")"
  | ";"
  | "assignment"
  | "comment"
  | "aggregator"
  | "date"
  | "time";

export interface Token {
  type: TokenType;
  value: string;
}

export type Tokens = List<Token>;

export type LexerResult =
  | { type: "success"; tokens: Tokens }
  | { type: "error"; description: string; tokens: Tokens };

export function lexerSuccess(tokens: Token[]): LexerResult {
  return {
    type: "success",
    tokens: new List(tokens),
  };
}

type Scanner = (input: string) => [Token, string] | null;

export class Lexer {
  /**
   *
   * Some regex scanners could also be converted to nameScanners:
   *
   * scanners = [
   *   regexScanner(/^(#.*)(.*)$/, "comment"),
   *   nameScanner([":", "="], "assignment", startsWith),
   *   nameScanner(["("], "(", startsWith),
   *   nameScanner([")"], ")", startsWith),
   *   regexScanner(/^([0-9]+(?:\.[0-9]+)?)\s*(.*)$/, "number"),
   *   nameScanner(operatorNames(), "operator", startsWith),
   *   nameScanner(aggregatorNames(), "aggregator", startsWithFollowedBySeparator),
   *   nameScanner(unitNames(), "unit", startsWithFollowedBySeparator),
   *   nameScanner(["to", "as"], "conversion", startsWithFollowedBySeparator),
   *   // https://stackoverflow.com/questions/20690499
   *   regexScanner(/^([a-zA-Z\u00C0-\u024F_]+)\s*(.*)$/, "identifier"),
   * ];
   *
   * The regex version is faster (~1400 vs ~1700 ms in chrome 65 for the following benchmark)
   *
   * const iterations = 100000;
   * console.time('Function #1');
   * for (let i = 0; i < iterations; i++) {
   *   lex("a : (0.1 cm - x in) to m");
   * };
   * console.timeEnd('Function #1')
   *
   */
  private readonly scanners: Scanner[];

  constructor(
    operatorNames: string[],
    functionNames: string[],
    unitNames: string[],
    aggregatorNames: string[],
    formatter: Formatter,
  ) {
    const nameCondition = startsWith([" ", ";", ")", "(", ...operatorNames]);
    this.scanners = [
      regexScanner(/^(#.*)(.*)$/, "comment"),
      regexScanner(/^([:=])\s*(.*)$/, "assignment"),
      regexScanner(/^([\(])\s*(.*)$/, "("),
      regexScanner(/^([\)])\s*(.*)$/, ")"),
      regexScanner(/^([;])\s*(.*)$/, ";"),
      regexScanner(formatter.getDateRegExp(), "date"),
      regexScanner(formatter.getTimeRegExp(), "time"),
      regexScanner(formatter.getNumberRegExp(), "number"),
      nameScanner(operatorNames, "operator", nameCondition),
      nameScanner(functionNames, "function", nameCondition),
      nameScanner(aggregatorNames, "aggregator", nameCondition),
      nameScanner(unitNames, "unit", nameCondition),
      // https://stackoverflow.com/questions/20690499
      regexScanner(/^([a-zA-Z\u00C0-\u024F_]+)\s*(.*)$/, "identifier"),
    ];
  }

  public lex(line: string): LexerResult {
    const tokens: Token[] = [];
    while (line.trim().length > 0) {
      const result = this.tryScanners(line.trim());
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

  private tryScanners(line: string): [Token, string] | null {
    for (const scanner of this.scanners) {
      const result = scanner(line);
      if (result) {
        return result;
      }
    }
    return null;
  }
}

function startsWith(separators: string[]): (input: string, name: string) => boolean {
  return (haytack: string, needle: string) => {
    if (haytack.toLowerCase().indexOf(needle.toLowerCase()) !== 0) {
      return false;
    }
    // Names that contain only letters must be separated from the next token
    // with a separator or end of input. Other names (like operators +, * etc.)
    // do not have to be separated, so the check above suffices to return true.
    if (needle.match(/^[a-z]+$/i)) {
      const remaining = haytack.substr(needle.length);
      return remaining === "" || separators.indexOf(remaining[0]) !== -1;
    }
    return true;
  };
}

function nameScanner(
  names: string[],
  type: TokenType,
  condition: (input: string, name: string) => boolean,
): Scanner {
  return (input: string) => {
    for (const name of names) {
      if (condition(input, name)) {
        return [
          {
            type,
            value: input.substr(0, name.length),
          },
          input.substr(name.length),
        ];
      }
    }
    return null;
  };
}

function regexScanner(regex: RegExp, type: TokenType): Scanner {
  return (input: string) => {
    const matched = input.match(regex);
    if (matched !== null) {
      return [
        {
          type,
          value: matched[1],
        },
        matched[2],
      ];
    }
    return null;
  };
}
