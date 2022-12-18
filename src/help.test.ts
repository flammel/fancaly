import { expect, test } from '@jest/globals';
import { execute } from './execute';
import { helpInput, helpOutput } from './help';

test('help', () => {
    expect(execute(helpInput).output.join('\n')).toBe(helpOutput);
});
