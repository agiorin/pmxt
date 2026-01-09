import pmxt from '../src';

async function run() {
    const kalshi = new pmxt.kalshi();
    const poly = new pmxt.polymarket();

    const kMarkets = await kalshi.getMarketsBySlug('KXFEDCHAIRNOM-29');
    // Filter for Kevin Warsh specifically
    const warshMarket = kMarkets.find(m => m.outcomes[0].label.includes('Kevin Warsh'));

    if (warshMarket) {
        console.log(`--- Kalshi Tape: ${warshMarket.outcomes[0].label} ---`);
        const trades = await kalshi.fetchTrades(warshMarket.id, { limit: 10, resolution: '1m' });
        trades.forEach(t => console.log(`${new Date(t.timestamp).toLocaleTimeString()} | ${t.side.toUpperCase()} | ${(t.price * 100).toFixed(1)}c | ${t.amount}`));
    }

    const pMarkets = await poly.getMarketsBySlug('who-will-trump-nominate-as-fed-chair');
    const pWarsh = pMarkets.find(m => m.outcomes[0].label.includes('Kevin Warsh'));

    if (pWarsh) {
        console.log(`\n--- Polymarket Tape: Kevin Warsh ---`);
        const tokenId = pWarsh.outcomes[0].metadata?.clobTokenId;
        const trades = await poly.fetchTrades(tokenId, { limit: 5, resolution: '1m' });
        trades.forEach(t => console.log(`${new Date(t.timestamp).toLocaleTimeString()} | ${t.side.toUpperCase()} | ${(t.price * 100).toFixed(1)}c | ${t.amount}`));
    }
}

run();
