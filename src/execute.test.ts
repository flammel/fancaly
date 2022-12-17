import { expect, test } from '@jest/globals';
import { execute } from './execute';

const tests = `
1 + 1               | 2
1 m + 1 mm          | 1.001 m
1 kg - 10 %         | 0.9 kg
9 * 10%             | 0.9
1,1 + 2.2           | 3.3
1_000_000 / 1_000   | 1 000
1m + 1 mm -> cm     | 100.1 cm
1 g TO kg           | 0.001 kg
100 € + 20 %        | 120 EUR
100 $ - 20 %        | 80 USD
100 * 20 %          | 20
`;

test.each(
    tests
        .split('\n')
        .filter((x) => x)
        .map((line) => line.split('|').map((x) => x.trim())),
)('%s', (input, output) => {
    expect(execute(input)).toEqual([output]);
});
