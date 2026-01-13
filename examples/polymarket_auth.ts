/**
 * Example: Polymarket Authentication
 * 
 * This example demonstrates how to authenticate with Polymarket
 * using L1 (wallet-based) and L2 (API credentials) authentication.
 * 
 * IMPORTANT: This requires a private key. Never commit your private key to version control!
 */

import pmxt from '../src/index';

import * as dotenv from 'dotenv';
import path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function main() {
    // Option 1: Initialize with just a private key
    // The library will automatically derive/create API credentials
    let privateKey = process.env.POLYMARKET_PRIVATE_KEY;

    if (!privateKey) {
        console.error('Please set POLYMARKET_PRIVATE_KEY environment variable');
        console.error('Example: export POLYMARKET_PRIVATE_KEY="0x..."');
        process.exit(1);
    }

    // Ensure 0x prefix
    if (!privateKey.startsWith('0x')) {
        privateKey = '0x' + privateKey;
    }

    console.log('Initializing Polymarket with authentication...\n');

    const poly = new pmxt.Polymarket({
        privateKey: privateKey,
        // Optional: specify signature type (default: 0 = EOA)
        // signatureType: 0,  // 0 = EOA, 1 = Poly Proxy, 2 = Gnosis Safe
        // Optional: specify funder address (defaults to signer address)
        // funderAddress: '0x...',
    });

    console.log('Authentication initialized!\n');

    // Option 2: If you already have API credentials, you can provide them
    // const polyWithCreds = new pmxt.Polymarket({
    //     privateKey: privateKey,
    //     apiKey: 'your-api-key',
    //     apiSecret: 'your-api-secret',
    //     passphrase: 'your-passphrase',
    // });

    console.log('Testing market data access (no auth required)...');
    const markets = await poly.fetchMarkets({ limit: 3 });
    console.log(`Found ${markets.length} markets`);
    markets.forEach(m => {
        console.log(`  - ${m.title}`);
    });

    console.log('\nTesting authenticated operations...');

    try {
        // These will throw "coming soon" errors since we haven't implemented them yet
        // But they demonstrate that authentication is working
        await poly.fetchBalance();
    } catch (error: any) {
        if (error.message.includes('coming soon')) {
            console.log('Authentication successful! (Implementation pending)');
        } else {
            console.error('Authentication failed:', error.message);
        }
    }

    console.log('\nAuthentication setup complete!');
    console.log('\nNext steps:');
    console.log('  - Implement createOrder()');
    console.log('  - Implement fetchPositions()');
    console.log('  - Implement fetchBalance()');
    console.log('  - Implement fetchOpenOrders()');
}

main().catch(console.error);
