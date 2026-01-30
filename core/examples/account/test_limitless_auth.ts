import { config } from 'dotenv';
import path from 'path';
// Load .env from the root directory
config({ path: path.resolve(__dirname, '../../../.env') });

import pmxt from '../../src/index';

async function testLimitless() {
    console.log('--- Initializing Limitless Client ---');
    if (!process.env.LIMITLESS_PRIVATE_KEY) {
        throw new Error('LIMITLESS_PRIVATE_KEY not found in .env');
    }

    const client = new pmxt.Limitless({
        privateKey: process.env.LIMITLESS_PRIVATE_KEY
    });

    try {
        console.log('\n--- Fetching Active Markets ---');
        const markets = await client.fetchMarkets({ limit: 5 });
        if (markets.length === 0) {
            console.log('No active markets found.');
        } else {
            console.table(markets.map(m => ({
                id: m.id,
                title: m.title.substring(0, 50),
                outcomes: m.outcomes.length,
                vol: m.volume24h
            })));
        }

        console.log('\n--- Fetching Account Balance ---');
        const balance = await client.fetchBalance();
        console.table(balance);

        console.log('\n--- Fetching Account Positions (REST API) ---');
        const positions = await client.fetchPositions();
        if (positions.length === 0) {
            const address = (client as any).ensureAuth().getAddress();
            console.log(`No open positions found for address: ${address}`);
        } else {
            console.table(positions);
        }

    } catch (error: any) {
        console.error(`\nTest failed: ${error.message}`);
    }
}

testLimitless();
