import { PolymarketExchange } from '../src/exchanges/polymarket';
import { KalshiExchange } from '../src/exchanges/kalshi';
import { LimitlessExchange } from '../src/exchanges/limitless';
import { resetCache as resetKalshiCache } from '../src/exchanges/kalshi/fetchMarkets';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from root .env
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function benchmark(name: string, exchange: any, query: string) {
    console.log(`\n--- Benchmarking ${name} ---`);
    const start = Date.now();
    try {
        const markets = await exchange.fetchMarkets({ query, limit: 10 });
        const end = Date.now();
        const duration = end - start;
        console.log(`Execution Speed: ${duration}ms`);
        console.log(`Results found: ${markets.length}`);
        if (markets.length > 0) {
            console.log('Sample results:');
            markets.slice(0, 3).forEach((m: any, i: number) => {
                console.log(`  ${i + 1}. ${m.title} (${m.volume24h ? 'Vol: $' + m.volume24h.toFixed(2) : 'No vol data'})`);
            });
        }
        return { name, duration, count: markets.length, success: true };
    } catch (error: any) {
        console.error(`Error benchmarking ${name}:`, error.message);
        return { name, duration: 0, count: 0, success: false };
    }
}

async function run() {
    const queries = ['Trump', 'BTC', 'Bitcoin'];
    const statuses: ('active' | 'closed')[] = ['active', 'closed'];

    // Initialize exchanges
    const kalshi = new KalshiExchange({
        apiKey: process.env.KALSHI_API_KEY,
        privateKey: process.env.KALSHI_PRIVATE_KEY
    });
    const polymarket = new PolymarketExchange();
    const limitless = new LimitlessExchange();

    const exchanges = [
        { name: 'Polymarket', instance: polymarket },
        { name: 'Kalshi', instance: kalshi },
        { name: 'Limitless', instance: limitless }
    ];

    const results = [];

    for (const query of queries) {
        for (const status of statuses) {
            console.log(`\n\n===== Testing Query: "${query}" | Status: ${status} =====`);

            // Reset caches before each combination for raw speed measurement
            resetKalshiCache();

            for (const exch of exchanges) {
                const start = Date.now();
                try {
                    const markets = await exch.instance.fetchMarkets({ query, status, limit: 10 });
                    const duration = Date.now() - start;

                    console.log(`[${exch.name}] ${duration}ms | Found: ${markets.length}`);

                    results.push({
                        Query: query,
                        Status: status,
                        Exchange: exch.name,
                        'Speed (ms)': duration,
                        Results: markets.length
                    });
                } catch (e: any) {
                    console.error(`[${exch.name}] FAILED: ${e.message}`);
                    results.push({
                        Query: query,
                        Status: status,
                        Exchange: exch.name,
                        'Speed (ms)': 'FAILED',
                        Results: 0
                    });
                }
            }
        }
    }

    console.log('\n\n--- COMPREHENSIVE BENCHMARK SUMMARY ---');
    console.table(results);
}

run().catch(console.error);
