import { Result } from '@badrap/result';

export type TokenType =
    | 'literal'
    | 'comment'
    | 'lparen'
    | 'rparen'
    | 'assignment'
    | 'conversion'
    | 'operator'
    | 'identifier';
export type Token = { type: TokenType; value: string };
export type Tokens = Token[];

type Scanner = (line: string) => [Token, string] | null;

const scanners: Scanner[] = [
    regexScanner('literal', /^[0-9][0-9_]*([,.][0-9]+)?/g),
    regexScanner('comment', /^#.*/g),
    regexScanner('lparen', /^\(/g),
    regexScanner('rparen', /^\)/g),
    regexScanner('assignment', /^(=|:)/gi),
    regexScanner('conversion', /^(->|to|as|in)/gi),
    regexScanner('operator', /^(\+|-|\*\*|\*|\/|\^)/gi),
    regexScanner('identifier', /^(%|\$|€|[a-zA-Z\u00C0-\u024F_][a-zA-Z0-9\u00C0-\u024F_]*)/g),
];

export function lex(line: string): Result<Tokens, Error> {
    const tokens: Tokens = [];
    line = line.trim();
    while (line.length > 0) {
        const result = scan(line.trim());
        if (result === null) {
            return Result.err(new Error('Cannot lex ' + line));
        } else {
            tokens.push(result[0]);
            line = result[1];
        }
    }
    return Result.ok(tokens);
}

function scan(line: string): [Token, string] | null {
    for (const scanner of scanners) {
        const result = scanner(line);
        if (result !== null) {
            return result;
        }
    }
    return null;
}

function regexScanner(tokenType: TokenType, regex: RegExp): Scanner {
    return (line) => {
        line = line.trim();
        regex.lastIndex = 0;
        regex.test(line);
        if (regex.lastIndex !== 0) {
            return [{ type: tokenType, value: line.substring(0, regex.lastIndex) }, line.substring(regex.lastIndex)];
        }
        return null;
    };
}
