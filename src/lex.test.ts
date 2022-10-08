import { expect, test } from '@jest/globals';
import { lex } from './lex';
import { testData } from './testData';
import { Result } from '@badrap/result';

test.each(testData)('$input', (item) => {
    expect(lex(item.input)).toEqual(Result.ok(item.tokens));
});
