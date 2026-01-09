import pmxt from '../src';

const main = async () => {
    const polySlug = process.argv[2] || 'who-will-trump-nominate-as-fed-chair';
    const kalshiTicker = process.argv[3] || 'KXFEDCHAIRNOM-29';

    console.log(`Fetching prices for: ${polySlug} / ${kalshiTicker}\n`);

    // Polymarket
    const polymarket = new pmxt.polymarket();
    const polyMarkets = await polymarket.getMarketsBySlug(polySlug);

    console.log('--- Polymarket ---');
    polyMarkets
        .sort((a, b) => b.outcomes[0].price - a.outcomes[0].price)
        .slice(0, 10)
        .forEach(m => {
            console.log(`${m.outcomes[0].label}: ${(m.outcomes[0].price * 100).toFixed(1)}% ` +
                `(Vol24h: $${m.volume24h.toLocaleString()})`);
        });

    // Kalshi
    const kalshi = new pmxt.kalshi();
    const kalshiMarkets = await kalshi.getMarketsBySlug(kalshiTicker);

    console.log('\n--- Kalshi ---');
    kalshiMarkets
        .sort((a, b) => b.outcomes[0].price - a.outcomes[0].price)
        .slice(0, 10)
        .forEach(m => {
            console.log(`${m.outcomes[0].label}: ${(m.outcomes[0].price * 100).toFixed(1)}% ` +
                `(Vol24h: $${m.volume24h.toLocaleString()})`);
        });
};

main();
