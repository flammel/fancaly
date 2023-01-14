import { Result } from '@badrap/result';
import { expect, test } from '@jest/globals';
import { parse } from './parse';
import { testData } from './testData';

test.each(testData)('$input', (item) => {
    expect(parse(item.tokens.map((t) => ({ ...t, from: 0, to: 0 }))).statements).toEqual(item.statements.map(Result.ok));
});
