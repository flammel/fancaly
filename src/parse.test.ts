import { expect, test } from '@jest/globals';
import { parse } from './parse';
import { testData } from './testData';
import { Result } from '@badrap/result';

test.each(testData)('$input', (item) => {
    expect(parse(item.tokens)).toEqual(Result.ok(item.ast));
});
