import { LRLanguage } from '@codemirror/language';
import { buildParser } from '@lezer/generator';
import { styleTags, tags } from '@lezer/highlight';
import { ExternalTokenizer, InputStream } from '@lezer/lr';
import { units } from './Unit';

const grammar = `
@external tokens unitTokens from "." { Unit }

@precedence {
    unary @left,
    power @right,
    unit @left,
    times @left,
    plus @left,
    conversion @right
}

@top Program { (Line lineEnd)* }

Line { Comment | Assignment | expression }
expression { Name | Number | UnaryExpression | BinaryExpression | Aggregation | ConversionExpression | UnitExpression |  "(" expression ")" }

Assignment { Name ("="|":") expression }
ConversionExpression { expression !conversion ConversionOp{"->"} Unit }
UnitExpression { expression !unit Unit }
UnaryExpression { ArithOp{"+" | "-"} !unary expression }

BinaryExpression {
    expression !power ArithOp{"^" | "**"} expression |
    expression !times ArithOp{"*" | "/"} expression |
    expression !plus ArithOp{"+" | "-"} expression
}

Aggregation { @specialize<Name, "sum" | "total" | "avg" | "average" | "mean"> }

@skip { space }

@tokens {
    intNumber { @digit+ ("_" @digit+)* }
    space { " "+ }
    lineEnd { @eof | "\n" }
    Name { @asciiLetter+ (@asciiLetter | @digit | "_")* }
    Number { intNumber | intNumber "." intNumber | intNumber "," intNumber }
    Comment { "#" ![\n]* }
}
`;

function unitTokenizer(unitTerm: number): ExternalTokenizer {
    return new ExternalTokenizer((input) => {
        function isASCIILetter(ch: number) {
            return (ch >= 97 && ch <= 122) || (ch >= 65 && ch <= 90);
        }

        function scan(input: InputStream, str: string): number | null {
            for (let idx = 0; idx < str.length; idx++) {
                if (input.peek(idx) !== str.charCodeAt(idx)) {
                    return null;
                }
            }
            const nextChar = input.peek(str.length + 1);
            if (!isASCIILetter(nextChar) || nextChar === -1) {
                return str.length;
            }
            return null;
        }

        for (const unit of units) {
            for (const unitName of [unit.name, ...(unit.synonyms ?? [])]) {
                const scanned = scan(input, unitName);
                if (scanned !== null) {
                    input.acceptToken(unitTerm, scanned);
                    return;
                }
            }
        }
    });
}

const parser = buildParser(grammar, {
    externalTokenizer: (name, terms) =>
        name === 'unitTokens' ? unitTokenizer(terms.Unit) : new ExternalTokenizer(() => {}),
});

export const notazaLanguage = LRLanguage.define({
    parser: parser.configure({
        props: [
            styleTags({
                Comment: tags.lineComment,
                Name: tags.variableName,
                Number: tags.number,
                ArithOp: tags.operator,
                ConversionOp: tags.operator,
                Aggregation: tags.operatorKeyword,
                Unit: tags.typeName,
                '( )': tags.paren,
            }),
        ],
    }),
});