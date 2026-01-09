import { PolymarketExchange } from '../src/exchanges/Polymarket';
import { KalshiExchange } from '../src/exchanges/Kalshi';

const main = async () => {
    const query = process.argv[2] || 'Fed';

    // Polymarket
    const polymarket = new PolymarketExchange();
    const polyResults = await polymarket.searchMarkets(query, { sort: 'volume' });

    console.log(`--- Polymarket (${polyResults.length} results) ---`);
    polyResults.slice(0, 5).forEach(m => {
        console.log(`${m.title}: ${m.outcomes[0].label} - $${m.volume24h.toLocaleString()}`);
    });

    // Kalshi
    const kalshi = new KalshiExchange();
    const kalshiResults = await kalshi.searchMarkets(query);

    console.log(`\n--- Kalshi (${kalshiResults.length} results) ---`);
    kalshiResults.slice(0, 5).forEach(m => {
        console.log(`${m.title}: ${m.outcomes[0].label} - $${m.volume24h.toLocaleString()}`);
    });
};

main();
