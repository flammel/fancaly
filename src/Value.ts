import { Result } from '@badrap/result';
import BigNumber from 'bignumber.js';
import { booleanUnit, Unit } from './Unit';

export class Value {
    public readonly bignum: BigNumber;

    public constructor(bignum: BigNumber.Value, public readonly unit?: Unit) {
        this.bignum = new BigNumber(bignum);
    }

    public toString(): string {
        if (this.unit?.group === 'boolean') {
            if (this.bignum.isEqualTo(0)) {
                return 'false';
            } else {
                return 'true';
            }
        }
        return this.bignum.decimalPlaces(12).toFormat({
            decimalSeparator: '.',
            groupSeparator: ' ',
            groupSize: 3,
            suffix: this.unit ? ' ' + this.unit.name : undefined,
            fractionGroupSeparator: ' ',
            fractionGroupSize: 4,
        });
    }

    public plus(other: Value): Result<Value, Error> {
        if (this.unit?.group !== 'percent' && other.unit?.group === 'percent') {
            return Result.ok(new Value(this.bignum.plus(this.bignum.dividedBy(100).times(other.bignum)), this.unit));
        }

        if (this.unit === undefined || other.unit === undefined) {
            return Result.ok(new Value(this.bignum.plus(other.bignum), this.unit ?? other.unit));
        }

        if (this.unit.group !== other.unit.group) {
            return Result.err(new Error('Cannot add ' + other.unit.name + ' to ' + this.unit.name));
        }

        return Result.ok(
            new Value(
                this.bignum
                    .times(this.unit.multiplier)
                    .plus(other.bignum.times(other.unit.multiplier))
                    .dividedBy(this.unit.multiplier),
                this.unit,
            ),
        );
    }

    public minus(other: Value): Result<Value, Error> {
        if (this.unit?.group !== 'percent' && other.unit?.group === 'percent') {
            return Result.ok(new Value(this.bignum.minus(this.bignum.dividedBy(100).times(other.bignum)), this.unit));
        }

        if (this.unit === undefined || other.unit === undefined) {
            return Result.ok(new Value(this.bignum.minus(other.bignum), this.unit ?? other.unit));
        }

        if (this.unit.group !== other.unit.group) {
            return Result.err(new Error('Cannot subtract ' + other.unit.name + ' from ' + this.unit.name));
        }

        return Result.ok(
            new Value(
                this.bignum
                    .times(this.unit.multiplier)
                    .minus(other.bignum.times(other.unit.multiplier))
                    .dividedBy(this.unit.multiplier),
                this.unit,
            ),
        );
    }

    public times(other: Value): Result<Value, Error> {
        if (this.unit?.group !== 'percent' && other.unit?.group === 'percent') {
            return Result.ok(new Value(this.bignum.dividedBy(100).times(other.bignum), this.unit));
        }

        if (this.unit !== undefined && other.unit !== undefined) {
            return Result.err(new Error('Cannot multiply values with units'));
        }

        return Result.ok(new Value(this.bignum.times(other.bignum), this.unit ?? other.unit));
    }

    public dividedBy(other: Value): Result<Value, Error> {
        if (this.unit !== undefined || other.unit !== undefined) {
            return Result.err(new Error('Cannot divide values with units'));
        }
        return Result.ok(new Value(this.bignum.dividedBy(other.bignum), this.unit));
    }

    public pow(other: Value): Result<Value, Error> {
        if (this.unit !== undefined || other.unit !== undefined) {
            return Result.err(new Error('Cannot pow values with units'));
        }
        if (other.bignum.isInteger()) {
            return Result.ok(new Value(this.bignum.pow(other.bignum), this.unit));
        } else {
            // BigNumber.js does not support non-integer exponents.
            return Result.ok(new Value(Math.pow(this.bignum.toNumber(), other.bignum.toNumber()), this.unit));
        }
    }

    public equals(other: Value): Result<Value, Error> {
        const converted = this.unit ? other.convertTo(this.unit) : Result.ok(other);
        return converted.chain(
            (value) => Result.ok(new Value(value.bignum.isEqualTo(this.bignum) ? 1 : 0, booleanUnit)),
            () => Result.ok(new Value(0, booleanUnit)),
        );
    }

    public notEquals(other: Value): Result<Value, Error> {
        return this.equals(other).map((value) => new Value(value.bignum.isEqualTo(0) ? 1 : 0, booleanUnit));
    }

    public negated(): Result<Value, Error> {
        return Result.ok(new Value(this.bignum.negated(), this.unit));
    }

    public convertTo(unit: Unit): Result<Value, Error> {
        if (this.unit === undefined) {
            return Result.ok(new Value(this.bignum, unit));
        }
        if (this.unit.group !== unit.group) {
            return Result.err(new Error('Cannot convert ' + this.unit.name + ' to ' + unit.name));
        }
        return Result.ok(new Value(this.bignum.times(this.unit.multiplier).dividedBy(unit.multiplier), unit));
    }

    public static sum(values: Value[]): Result<Value, Error> {
        if (values.length === 0) {
            return Result.err(new Error('No values'));
        }
        const unit = values.find((value) => value.unit !== undefined)?.unit;
        const converted = unit === undefined ? Result.ok(values) : Value.convertAll(values, unit);
        return converted.map((values) => new Value(BigNumber.sum(...values.map((value) => value.bignum)), unit));
    }

    public static average(values: Value[]): Result<Value, Error> {
        return Value.sum(values).chain((value) => value.dividedBy(new Value(values.length)));
    }

    public static minimum(values: Value[]): Result<Value, Error> {
        if (values.length === 0) {
            return Result.err(new Error('No values'));
        }
        const unit = values.find((value) => value.unit !== undefined)?.unit;
        const converted = unit === undefined ? Result.ok(values) : Value.convertAll(values, unit);
        return converted.map((values) => new Value(BigNumber.minimum(...values.map((value) => value.bignum)), unit));
    }

    public static maximum(values: Value[]): Result<Value, Error> {
        if (values.length === 0) {
            return Result.err(new Error('No values'));
        }
        const unit = values.find((value) => value.unit !== undefined)?.unit;
        const converted = unit === undefined ? Result.ok(values) : Value.convertAll(values, unit);
        return converted.map((values) => new Value(BigNumber.maximum(...values.map((value) => value.bignum)), unit));
    }

    public static convertAll(values: Value[], unit: Unit): Result<Value[], Error> {
        const converted = [];
        for (const value of values) {
            const convertedValue = value.convertTo(unit);
            if (convertedValue.isOk) {
                converted.push(convertedValue.value);
            } else {
                return Result.err(convertedValue.error);
            }
        }
        return Result.ok(converted);
    }

    public static fromString(value: string, unit?: Unit): Result<Value, Error> {
        return Result.ok(
            new Value(new BigNumber(value.replace(',', '.').replaceAll('_', '').replaceAll(' ', '')), unit),
        );
    }
    public static cos(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.cos(value.bignum.toNumber()), value.unit));
    }
    public static sin(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.sin(value.bignum.toNumber()), value.unit));
    }
    public static tan(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.tan(value.bignum.toNumber()), value.unit));
    }
    public static arccos(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.acos(value.bignum.toNumber()), value.unit));
    }
    public static arcsin(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.asin(value.bignum.toNumber()), value.unit));
    }
    public static arctan(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.atan(value.bignum.toNumber()), value.unit));
    }
    public static ln(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.log(value.bignum.toNumber()), value.unit));
    }
    public static lg(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.log10(value.bignum.toNumber()), value.unit));
    }
    public static ld(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.log2(value.bignum.toNumber()), value.unit));
    }
    public static abs(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.abs(value.bignum.toNumber()), value.unit));
    }
    public static sqrt(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.sqrt(value.bignum.toNumber()), value.unit));
    }
    public static round(value: Value): Result<Value, Error> {
        return Result.ok(new Value(Math.round(value.bignum.toNumber()), value.unit));
    }
}
