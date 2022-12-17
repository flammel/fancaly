export const tests: Array<{input: string, node: string, output:string}> = [
    {
        input: '1 + 1',
        node: 'Program(Line(BinaryExpression(Number,ArithOp,Number)))',
        output: '2'
    },
    {
        input: '1m + 10mm',
        node: 'Program(Line(BinaryExpression(UnitExpression(Number,Unit),ArithOp,UnitExpression(Number,Unit))))',
        output: '1.01 m',
    },
    {
        input: '1 kg - 10 %',
        node: 'Program(Line(BinaryExpression(UnitExpression(Number,Unit),ArithOp,UnitExpression(Number,Unit))))',
        output: '0.9 kg',
    },
    {
        input: '9 * 10%',
        node: 'Program(Line(BinaryExpression(Number,ArithOp,UnitExpression(Number,Unit))))',
        output: '0.9'
    },
    {
        input: '1,1 + 2.2',
        node: 'Program(Line(BinaryExpression(Number,ArithOp,Number)))',
        output: '3.3'
    },
    {
        input: '1_000_000 / 1_000',
        node: 'Program(Line(BinaryExpression(Number,ArithOp,Number)))',
        output: '1 000'
    },
    {
        input: '1m + 1 mm -> cm',
        node: 'Program(Line(ConversionExpression(BinaryExpression(UnitExpression(Number,Unit),ArithOp,UnitExpression(Number,Unit)),ConversionOp,Unit)))',
        output: '100.1 cm',
    },
    {
        input: '1 g -> kg',
        node: 'Program(Line(ConversionExpression(UnitExpression(Number,Unit),ConversionOp,Unit)))',
        output: '0.001 kg',
    },
    {
        input: '1 h to s',
        node: 'Program(Line(ConversionExpression(UnitExpression(Number,Unit),ConversionOp,Unit)))',
        output: '3 600 s',
    },
    {
        input: '1 mm in m',
        node: 'Program(Line(ConversionExpression(UnitExpression(Number,Unit),ConversionOp,Unit)))',
        output: '1 m',
    },
    {
        input: '100 € + 20 %',
        node: 'Program(Line(BinaryExpression(UnitExpression(Number,Unit),ArithOp,UnitExpression(Number,Unit))))',
        output: '120 EUR',
    },
    {
        input: '100 $ - 20 %',
        node: 'Program(Line(BinaryExpression(UnitExpression(Number,Unit),ArithOp,UnitExpression(Number,Unit))))',
        output: '80 USD',
    },
    {
        input: '100 * 20 %',
        node: 'Program(Line(BinaryExpression(Number,ArithOp,UnitExpression(Number,Unit))))',
        output: '20'
    },
    {
        input: '(1 m + 10.4 %) in mm',
        node: 'Program(Line(ConversionExpression(BinaryExpression(UnitExpression(Number,Unit),ArithOp,UnitExpression(Number,Unit)),ConversionOp,Unit)))',
        output: '1,104 mm'
    },
    {
        input: 'x = (1 m + 10.4 %) to mm',
        node: 'Program(Line(Assignment(Name,ConversionExpression(BinaryExpression(UnitExpression(Number,Unit),ArithOp,UnitExpression(Number,Unit)),ConversionOp,Unit))))',
        output: '1,104 mm'
    }
];
