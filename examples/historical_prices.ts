import pmxt from '../src';

const main = async () => {
    const candidateName = 'Kevin Warsh';  // Compare the SAME candidate on both platforms

    // Polymarket - Get historical prices for Kevin Warsh
    const polymarket = new pmxt.polymarket();
    const polyMarkets = await polymarket.getMarketsBySlug('who-will-trump-nominate-as-fed-chair');
    const polyWarsh = polyMarkets.find(m => m.outcomes[0].label.includes(candidateName));

    if (polyWarsh) {
        const tokenId = polyWarsh.outcomes[0].metadata?.clobTokenId;
        console.log(`--- Polymarket: ${candidateName} ---`);
        const polyHistory = await polymarket.fetchOHLCV(tokenId, {
            resolution: '1h',
            limit: 5
        });
        polyHistory.forEach(candle => {
            console.log(`${new Date(candle.timestamp).toLocaleString()} | Price: $${candle.close.toFixed(2)}`);
        });
    } else {
        console.log(`Polymarket: ${candidateName} not found`);
    }

    // Kalshi - Get historical prices for Kevin Warsh
    const kalshi = new pmxt.kalshi();
    const kalshiMarkets = await kalshi.getMarketsBySlug('KXFEDCHAIRNOM-29');
    const kalshiWarsh = kalshiMarkets.find(m => m.outcomes[0].label.includes(candidateName));

    if (kalshiWarsh) {
        console.log(`\n--- Kalshi: ${candidateName} ---`);
        const kalshiHistory = await kalshi.fetchOHLCV(kalshiWarsh.id, {
            resolution: '1h',
            limit: 5
        });
        kalshiHistory.forEach(candle => {
            console.log(`${new Date(candle.timestamp).toLocaleString()} | Price: $${candle.close.toFixed(2)}`);
        });
    } else {
        console.log(`\nKalshi: ${candidateName} not found`);
    }
};

main();
