import { expect, test } from '@jest/globals';
import { testData } from './testData';
import { evaluate } from './evaluate';
import { Result } from '@badrap/result';

test.each(testData)('$input', (item) => {
    expect(
        evaluate({ statements: item.statements.map(Result.ok), highlightTokens: [] })
            .getResults()
            .map((result) =>
                result.isOk ? (result.value === null ? '' : result.value.toString()) : result.error.message,
            ),
    ).toEqual(item.result);
});
