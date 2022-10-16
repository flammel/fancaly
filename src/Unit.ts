import { Result } from '@badrap/result';

export type Unit = {
    name: string;
    group: 'weight' | 'length' | 'percent' | 'currency';
    multiplier: number;
    exponent?: number;
    synonyms?: string[];
};

export const units: Unit[] = [
    { name: 'mm', group: 'length', multiplier: 1, exponent: 1 },
    { name: 'cm', group: 'length', multiplier: 10, exponent: 1 },
    { name: 'm', group: 'length', multiplier: 1000, exponent: 1 },
    { name: 'km', group: 'length', multiplier: 1000000, exponent: 1 },
    { name: 'in', group: 'length', multiplier: 25.4, exponent: 1 },
    { name: 'ft', group: 'length', multiplier: 304.8, exponent: 1 },

    { name: 'g', group: 'weight', multiplier: 1 },
    { name: 'dkg', group: 'weight', multiplier: 10 },
    { name: 'kg', group: 'weight', multiplier: 1000 },
    { name: 't', group: 'weight', multiplier: 1000000 },
    { name: 'oz', group: 'weight', multiplier: 28.3495 },

    { name: '%', group: 'percent', multiplier: 1 },

    { name: 'EUR', group: 'currency', multiplier: 1, synonyms: ['€'] },
    { name: 'USD', group: 'currency', multiplier: 1, synonyms: ['$'] },
];

export function isUnit(name: string): boolean {
    return findUnit(name).isOk;
}

export function findUnit(name: string): Result<Unit, Error> {
    const unit = units.find(
        (unit) => unit.name.toLowerCase() === name.toLowerCase() || unit.synonyms?.includes(name.toLowerCase()),
    );
    return unit === undefined ? Result.err(new Error('Unknown unit ' + name)) : Result.ok(unit);
}
