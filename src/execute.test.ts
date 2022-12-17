import { expect, test } from '@jest/globals';
import { notazaLanguage } from './language';
import { execute } from './execute';
import { tests } from './testData';

test.each(tests.map((item) => [item.input, item.output]))('%s', (input, output) => {
    expect(execute(input, notazaLanguage)).toEqual([output]);
});
