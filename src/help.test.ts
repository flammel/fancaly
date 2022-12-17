import { expect, test } from '@jest/globals';
import { notazaLanguage } from './language';
import { execute } from './execute';
import { helpInput, helpOutput } from './help';

test('help', () => {
    expect(execute(helpInput, notazaLanguage)).toBe(helpOutput);
});
