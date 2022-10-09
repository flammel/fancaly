import { Result } from '@badrap/result';

export type TokenType = 'literal' | 'operator' | 'assignment' | 'lparen' | 'rparen' | 'identifier' | 'percent';
export type Token = { type: TokenType; value: string };
export type Tokens = Token[];

export function lex(line: string): Result<Tokens, Error> {
    const tokens: Tokens = [];

    const scanNumber = (startIndex: number): number => {
        let endIndex = startIndex + 1;
        let char;
        while ((char = line.at(endIndex))) {
            if ('0123456789,._'.includes(char)) {
                endIndex++;
            } else {
                break;
            }
        }
        tokens.push({ type: 'literal', value: line.slice(startIndex, endIndex) });
        return endIndex - 1;
    };

    const scanWord = (startIndex: number): number => {
        let endIndex = startIndex + 1;
        let char;
        while ((char = line.at(endIndex))) {
            if (/[_a-zA-Z0-9$€\u00C0-\u024F]/.test(char)) {
                endIndex++;
            } else {
                break;
            }
        }
        tokens.push({ type: 'identifier', value: line.slice(startIndex, endIndex) });
        return endIndex - 1;
    };

    for (let index = 0; index < line.length; index++) {
        const char = line.at(index);
        switch (char) {
            case undefined:
                break;
            case '=':
            case ':':
                tokens.push({ type: 'assignment', value: char });
                break;
            case '%':
                tokens.push({ type: 'percent', value: char });
                break;
            case '(':
                tokens.push({ type: 'lparen', value: char });
                break;
            case ')':
                tokens.push({ type: 'rparen', value: char });
                break;
            case '+':
            case '-':
            case '/':
            case '^':
                tokens.push({ type: 'operator', value: char });
                break;
            case '*':
                if (line.at(index + 1) === '*') {
                    tokens.push({ type: 'operator', value: '**' });
                    index++;
                } else {
                    tokens.push({ type: 'operator', value: '*' });
                }
                break;
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '8':
            case '9':
                index = scanNumber(index);
                break;
            default:
                index = /\s/.test(char) ? index : scanWord(index);
        }
    }
    return Result.ok(tokens);
}
