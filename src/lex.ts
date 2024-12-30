import { Result } from '@badrap/result';

type TokenType =
    | 'literal'
    | 'comment'
    | 'lparen'
    | 'rparen'
    | 'semicolon'
    | 'conversion'
    | 'operator'
    | 'assignment'
    | 'identifier';
export interface Token {
    type: TokenType;
    value: string;
    from: number;
    to: number;
}

type Scanner = (input: string, position: number) => Token | null;

const scanners: Scanner[] = [
    regexScanner('literal', /^[0-9]([0-9]|_[0-9]| [0-9])*([,.][0-9]+)?([0-9]|_[0-9]| [0-9])*/g),
    regexScanner('comment', /^#.*/g),
    regexScanner('lparen', /^\(/g),
    regexScanner('rparen', /^\)/g),
    regexScanner('semicolon', /^;/g),
    regexScanner('conversion', /^(->)/g),
    regexScanner('operator', /^(\+|-|\*\*|\*|\/|\^|===|==|!==|!=)/g),
    regexScanner('assignment', /^(=|:)/g),
    regexScanner('identifier', /^(%|\$|€|[a-zA-Z\u00C0-\u024F_][a-zA-Z0-9\u00C0-\u024F_]*)/g),
];

export function lex(input: string): Result<Token[]> {
    const tokens: Token[] = [];
    let position = 0;
    while (position < input.length) {
        if (input.at(position) === ' ') {
            position++;
            continue;
        }
        const result = scan(input, position);
        if (result === null) {
            return Result.err(new Error('Cannot lex ' + input.substring(position)));
        } else {
            tokens.push(result);
            position = position + result.value.length;
        }
    }
    return Result.ok(tokens);
}

function scan(input: string, position: number): Token | null {
    for (const scanner of scanners) {
        const result = scanner(input, position);
        if (result !== null) {
            return result;
        }
    }
    return null;
}

function regexScanner(tokenType: TokenType, regex: RegExp): Scanner {
    return (input, position) => {
        regex.lastIndex = 0;
        regex.test(input.substring(position));
        if (regex.lastIndex !== 0) {
            return {
                type: tokenType,
                value: input.substring(position, position + regex.lastIndex),
                from: position,
                to: position + regex.lastIndex,
            };
        }
        return null;
    };
}
