import axios from 'axios';
import { LimitlessExchange } from '../../../src/exchanges/limitless';

/**
 * Limitless Error Handling Test
 * 
 * What: Tests how the Limitless exchange handle API errors and network failures.
 * Why: To ensure application stability when external services are unavailable.
 * How: Mocks a rejected axios promise and verifies that the exchange returns an empty 
 *      array instead of throwing, and logs the error.
 */

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('LimitlessExchange - Error Handling', () => {
    let exchange: LimitlessExchange;

    beforeEach(() => {
        exchange = new LimitlessExchange();
        jest.clearAllMocks();
    });

    it('should handle API errors by returning an empty list', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network Error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => { });

        const markets = await exchange.fetchMarkets();

        expect(markets).toEqual([]);
        expect(consoleSpy).toHaveBeenCalled();
        consoleSpy.mockRestore();
    });
});
