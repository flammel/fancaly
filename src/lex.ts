import { Result } from '@badrap/result';

export type TokenType = 'literal' | 'operator' | 'assignment' | 'lparen' | 'rparen' | 'identifier' | 'percent';
export type Token = { type: TokenType; value: string };
export type Tokens = Token[];

type ScannerRule = [TokenType, RegExp];
const scannerRules: ScannerRule[] = [
    ['literal', /^[0-9][0-9_]*([,.][0-9]+)?/g],
    ['operator', /^(\+|\-|\*\*|\*|\/|\^)/g],
    ['lparen', /^\(/g],
    ['rparen', /^\)/g],
    ['percent', /^%/g],
    ['assignment', /^(=|:)/g],
    ['identifier', /^[a-zA-Z\u00C0-\u024F_][a-zA-Z0-9\u00C0-\u024F_]*/g],
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
    for (const scannerRule of scannerRules) {
        scannerRule[1].lastIndex = 0;
        scannerRule[1].test(line);
        if (scannerRule[1].lastIndex !== 0) {
            return [{type: scannerRule[0], value: line.substring(0, scannerRule[1].lastIndex)}, line.substring(scannerRule[1].lastIndex)];
        }
    }
    return null;
}