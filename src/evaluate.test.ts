import { expect, test } from '@jest/globals';
import { testData } from './testData';
import { Result } from '@badrap/result';
import { evaluate } from './evaluate';
import { Environment } from './Environment';
import { defaultContext } from './Context';

test.each(testData)('$input', (item) => {
    const environment = item.inputEnvironment ?? new Environment();
    expect(evaluate(defaultContext, environment, item.ast).map((x) => x.toString())).toEqual(Result.ok(item.result));
    if (item.outputEnvironment) {
        expect(environment).toEqual(item.outputEnvironment);
    }
});
