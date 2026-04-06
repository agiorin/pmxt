import { SmarketsAuth } from '../../../src/exchanges/smarkets/auth';

describe('SmarketsAuth', () => {
    const validCredentials = {
        apiKey: 'user@example.com',
        privateKey: 'hunter2',
    };

    describe('constructor / validation', () => {
        test('accepts valid credentials', () => {
            expect(() => new SmarketsAuth(validCredentials)).not.toThrow();
        });

        test('throws when apiKey is missing', () => {
            expect(() =>
                new SmarketsAuth({ privateKey: 'pw' } as any),
            ).toThrow(/apiKey/);
        });

        test('throws when privateKey is missing', () => {
            expect(() =>
                new SmarketsAuth({ apiKey: 'user@example.com' } as any),
            ).toThrow(/privateKey/);
        });
    });

    describe('username / password accessors', () => {
        const auth = new SmarketsAuth(validCredentials);
        test('returns the apiKey as username', () => {
            expect(auth.getUsername()).toBe('user@example.com');
        });
        test('returns the privateKey as password', () => {
            expect(auth.getPassword()).toBe('hunter2');
        });
    });

    describe('session lifecycle', () => {
        test('isAuthenticated() is false before setToken', () => {
            const auth = new SmarketsAuth(validCredentials);
            expect(auth.isAuthenticated()).toBe(false);
            expect(auth.isExpired()).toBe(true);
        });

        test('isAuthenticated() is true after setToken with future expiry', () => {
            const auth = new SmarketsAuth(validCredentials);
            const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            auth.setToken('tok-abc', future);
            expect(auth.isAuthenticated()).toBe(true);
            expect(auth.isExpired()).toBe(false);
        });

        test('isAuthenticated() is false after token expires', () => {
            const auth = new SmarketsAuth(validCredentials);
            const past = new Date(Date.now() - 60 * 1000).toISOString();
            auth.setToken('tok-abc', past);
            expect(auth.isAuthenticated()).toBe(false);
            expect(auth.isExpired()).toBe(true);
        });

        test('falls back to a 30-min TTL when expiry is unparseable', () => {
            const auth = new SmarketsAuth(validCredentials);
            auth.setToken('tok-abc', 'not-a-date');
            expect(auth.isAuthenticated()).toBe(true);
        });

        test('reset() clears the session', () => {
            const auth = new SmarketsAuth(validCredentials);
            const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            auth.setToken('tok-abc', future);
            auth.reset();
            expect(auth.isAuthenticated()).toBe(false);
            expect(() => auth.getHeaders('GET', '/x')).toThrow();
        });
    });

    describe('getHeaders', () => {
        test('returns Session-Token authorization once a token is set', () => {
            const auth = new SmarketsAuth(validCredentials);
            const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            auth.setToken('tok-xyz', future);

            const headers = auth.getHeaders('GET', '/v3/accounts/');
            expect(headers['Authorization']).toBe('Session-Token tok-xyz');
            expect(headers['Content-Type']).toBe('application/json');
        });

        test('throws if no token has been set', () => {
            const auth = new SmarketsAuth(validCredentials);
            expect(() => auth.getHeaders('GET', '/x')).toThrow(/session token/i);
        });
    });
});
