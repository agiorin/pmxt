import pmxt from '../src';

const main = async () => {
    // Polymarket - Get historical prices
    const polymarket = new pmxt.polymarket();
    const polyMarkets = await polymarket.getMarketsBySlug('who-will-trump-nominate-as-fed-chair');
    const tokenId = polyMarkets[0].outcomes[0].metadata?.clobTokenId;

    console.log('--- Polymarket Historical Prices ---');
    const polyHistory = await polymarket.fetchOHLCV(tokenId, {
        resolution: '1h',
        limit: 5
    });
    polyHistory.forEach(candle => {
        console.log(`${new Date(candle.timestamp).toLocaleString()} | Price: $${candle.close.toFixed(2)}`);
    });

    // Kalshi - Get historical prices
    const kalshi = new pmxt.kalshi();
    const kalshiMarkets = await kalshi.getMarketsBySlug('KXFEDCHAIRNOM-29');

    console.log('\n--- Kalshi Historical Prices ---');
    const kalshiHistory = await kalshi.fetchOHLCV(kalshiMarkets[0].id, {
        resolution: '1h',
        limit: 5
    });
    kalshiHistory.forEach(candle => {
        console.log(`${new Date(candle.timestamp).toLocaleString()} | Price: $${candle.close.toFixed(2)}`);
    });
};

main();
