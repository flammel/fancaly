import { expect, test } from '@jest/globals';
import { testData } from './testData';
import { Result } from '@badrap/result';
import { evaluate } from './evaluate';
import { emptyEnvironment } from './Environment';
import { defaultContext } from './Context';
import { formatValue } from './Value';

test.each(testData)('$input', (item) => {
    const environment = item.inputEnvironment ?? emptyEnvironment();
    expect(evaluate(defaultContext, environment, item.ast).map((x) => formatValue(x))).toEqual(Result.ok(item.result));
    if (item.variables) {
        for (const entry of item.variables.entries()) {
            expect(environment.variables.get(entry[0])).toEqual(entry[1]);
        }
    }
});
