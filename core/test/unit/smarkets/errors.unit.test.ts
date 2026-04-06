import { AxiosError, AxiosResponse, AxiosRequestHeaders } from 'axios';
import { smarketsErrorMapper } from '../../../src/exchanges/smarkets/errors';
import {
    AuthenticationError,
    BadRequest,
    ExchangeNotAvailable,
    InsufficientFunds,
    InvalidOrder,
    MarketNotFound,
    OrderNotFound,
    PermissionDenied,
    RateLimitExceeded,
} from '../../../src/errors';

function makeAxiosError(
    status: number,
    data: any,
    headers: Record<string, string> = {},
): AxiosError {
    const response: AxiosResponse = {
        status,
        statusText: '',
        data,
        headers,
        config: { headers: {} as AxiosRequestHeaders },
    };
    const err = new AxiosError(
        'Smarkets error',
        String(status),
        response.config as any,
        null,
        response,
    );
    return err;
}

describe('SmarketsErrorMapper', () => {
    test('maps INVALID_CREDENTIALS to AuthenticationError', () => {
        const err = makeAxiosError(401, {
            error_type: 'INVALID_CREDENTIALS',
            data: 'bad password',
        });
        const mapped = smarketsErrorMapper.mapError(err);
        expect(mapped).toBeInstanceOf(AuthenticationError);
        expect(mapped.message).toContain('INVALID_CREDENTIALS');
        expect(mapped.message).toContain('bad password');
    });

    test('maps RATE_LIMIT_EXCEEDED to RateLimitExceeded with retry-after', () => {
        const err = makeAxiosError(
            429,
            { error_type: 'RATE_LIMIT_EXCEEDED', data: 'slow down' },
            { 'retry-after': '12' },
        );
        const mapped = smarketsErrorMapper.mapError(err) as RateLimitExceeded;
        expect(mapped).toBeInstanceOf(RateLimitExceeded);
        expect(mapped.retryAfter).toBe(12);
    });

    test('maps USER_SUSPENDED to PermissionDenied', () => {
        const err = makeAxiosError(403, {
            error_type: 'USER_SUSPENDED',
            data: null,
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(PermissionDenied);
    });

    test('maps ORDER_REJECTED_INSUFFICIENT_FUNDS to InsufficientFunds', () => {
        const err = makeAxiosError(400, {
            error_type: 'ORDER_REJECTED_INSUFFICIENT_FUNDS',
            data: 'broke',
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(InsufficientFunds);
    });

    test('maps ORDER_INVALID_INVALID_PRICE to InvalidOrder', () => {
        const err = makeAxiosError(400, {
            error_type: 'ORDER_INVALID_INVALID_PRICE',
            data: 'price out of range',
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(InvalidOrder);
    });

    test('maps ORDER_REJECTED_MARKET_NOT_FOUND to MarketNotFound', () => {
        const err = makeAxiosError(400, {
            error_type: 'ORDER_REJECTED_MARKET_NOT_FOUND',
            data: 'no such market',
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(MarketNotFound);
    });

    test('maps ORDER_CANCEL_REJECTED_NOT_FOUND to OrderNotFound', () => {
        const err = makeAxiosError(400, {
            error_type: 'ORDER_CANCEL_REJECTED_NOT_FOUND',
            data: 'no such order',
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(OrderNotFound);
    });

    test('maps INTERNAL_ERROR to ExchangeNotAvailable', () => {
        const err = makeAxiosError(500, {
            error_type: 'INTERNAL_ERROR',
            data: 'boom',
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(ExchangeNotAvailable);
    });

    test('maps unknown *_UNAVAILABLE pattern to ExchangeNotAvailable', () => {
        const err = makeAxiosError(503, {
            error_type: 'NEW_SERVICE_UNAVAILABLE',
            data: null,
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(ExchangeNotAvailable);
    });

    test('maps unknown *_TIMEOUT pattern to ExchangeNotAvailable', () => {
        const err = makeAxiosError(504, {
            error_type: 'NEW_GATEWAY_TIMEOUT',
            data: null,
        });
        expect(smarketsErrorMapper.mapError(err)).toBeInstanceOf(ExchangeNotAvailable);
    });

    test('falls back to status-code mapping when error_type is unknown', () => {
        const err = makeAxiosError(400, {
            error_type: 'TOTALLY_UNKNOWN',
            data: 'something',
        });
        const mapped = smarketsErrorMapper.mapError(err);
        // Unknown errors at 400 fall through to BadRequest (or a subclass)
        expect(mapped).toBeInstanceOf(BadRequest);
    });

    test('formatted error message includes status, error_type, and data', () => {
        const err = makeAxiosError(400, {
            error_type: 'ORDER_INVALID_INVALID_PRICE',
            data: 'must be between 0 and 10000',
        });
        const mapped = smarketsErrorMapper.mapError(err);
        expect(mapped.message).toContain('[400]');
        expect(mapped.message).toContain('ORDER_INVALID_INVALID_PRICE');
        expect(mapped.message).toContain('must be between 0 and 10000');
    });
});
