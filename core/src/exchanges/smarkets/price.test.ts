import {
    fromBasisPoints,
    toBasisPoints,
    fromQuantityUnits,
    toQuantityUnits,
    invertProbability,
} from './price';

describe('Smarkets price conversions', () => {
    describe('fromBasisPoints', () => {
        test('converts basis points to a probability', () => {
            expect(fromBasisPoints(0)).toBe(0);
            expect(fromBasisPoints(5500)).toBe(0.55);
            expect(fromBasisPoints(10000)).toBe(1);
        });
    });

    describe('toBasisPoints', () => {
        test('converts a probability to basis points', () => {
            expect(toBasisPoints(0)).toBe(0);
            expect(toBasisPoints(0.55)).toBe(5500);
            expect(toBasisPoints(1)).toBe(10000);
        });

        test('rounds non-integer results', () => {
            expect(toBasisPoints(0.12345)).toBe(1235);
        });

        test('round-trips with fromBasisPoints', () => {
            const bp = toBasisPoints(0.42);
            expect(fromBasisPoints(bp)).toBeCloseTo(0.42);
        });
    });

    describe('fromQuantityUnits', () => {
        test('converts quantity units to GBP', () => {
            expect(fromQuantityUnits(0)).toBe(0);
            expect(fromQuantityUnits(10000)).toBe(1);
            expect(fromQuantityUnits(25000)).toBe(2.5);
        });
    });

    describe('toQuantityUnits', () => {
        test('converts GBP to quantity units', () => {
            expect(toQuantityUnits(0)).toBe(0);
            expect(toQuantityUnits(1)).toBe(10000);
            expect(toQuantityUnits(2.5)).toBe(25000);
        });

        test('rounds fractional units', () => {
            expect(toQuantityUnits(0.123456)).toBe(1235);
        });
    });

    describe('invertProbability', () => {
        test('returns the complement of a probability', () => {
            expect(invertProbability(0)).toBe(1);
            expect(invertProbability(1)).toBe(0);
            expect(invertProbability(0.3)).toBeCloseTo(0.7);
        });
    });
});
