import { expect, test } from '@jest/globals';
import { notazaLanguage } from './language';
import { tests } from './testData';

test.each(tests.map((item) => [item.input, item.node]))('%s', (input, output) => {
    expect(notazaLanguage.parser.parse(input).topNode.toString()).toEqual(output);
});