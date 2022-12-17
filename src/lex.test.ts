import { expect, test } from '@jest/globals';
import { lex } from './lex';
import { testData } from './testData';

test.each(testData)('$input', (item) => {
    expect(
        lex(item.input)
            .unwrap()
            .map((t) => ({ type: t.type, value: t.value })),
    ).toEqual(item.tokens);
});
