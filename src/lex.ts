import { Result } from '@badrap/result';
import { Token, Tokens, TokenType } from './Token';

type Scanner = (input: string) => [Token, string] | null;

const scanners = [
    regexScanner(/^([0-9]+(?:[,.][0-9]+)?)\s*(.*)$/, 'literal'),
    regexScanner(/^([+\-^*/])\s*(.*)$/, 'operator'),
    regexScanner(/^([(])\s*(.*)$/, 'lparen'),
    regexScanner(/^([)])\s*(.*)$/, 'rparen'),
    regexScanner(/^([:=])\s*(.*)$/, 'assignment'),
    regexScanner(/^([a-zA-Z\u00C0-\u024F_][a-zA-Z0-9\u00C0-\u024F_]*)\s*(.*)$/, 'identifier'),
];

export function lex(line: string): Result<Tokens, Error> {
    const tokens: Tokens = [];
    line = line.trim();
    while (line.length > 0) {
        const result = tryScanners(scanners, line);
        if (result === null) {
            return Result.err(new Error('Cannot lex ' + line));
        } else {
            tokens.push(result[0]);
            line = result[1];
        }
    }
    return Result.ok(tokens);
}

function tryScanners(scanners: Scanner[], line: string): [Token, string] | null {
    for (const scanner of scanners) {
        const result = scanner(line);
        if (result !== null) {
            return result;
        }
    }
    return null;
}

function regexScanner(regex: RegExp, type: TokenType): Scanner {
    return (input: string) => {
        const matched = input.match(regex);
        if (matched !== null) {
            return [{ type, value: matched[1] }, matched[2]];
        }
        return null;
    };
}
