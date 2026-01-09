import { PolymarketExchange } from '../src/exchanges/Polymarket';
import { KalshiExchange } from '../src/exchanges/Kalshi';

const main = async () => {
    // Polymarket - Get order book
    const polymarket = new PolymarketExchange();
    const polyMarkets = await polymarket.getMarketsBySlug('who-will-trump-nominate-as-fed-chair');
    const tokenId = polyMarkets[0].outcomes[0].metadata?.clobTokenId;

    console.log('--- Polymarket Order Book ---');
    const polyBook = await polymarket.getOrderBook(tokenId);
    console.log('Asks:');
    polyBook.asks.slice(0, 3).forEach((ask, i) => {
        console.log(`  ${i + 1}. Price: $${ask.price.toFixed(2)} | Size: ${ask.size.toLocaleString()}`);
    });
    console.log('Bids:');
    polyBook.bids.slice(0, 3).forEach((bid, i) => {
        console.log(`  ${i + 1}. Price: $${bid.price.toFixed(2)} | Size: ${bid.size.toLocaleString()}`);
    });

    // Kalshi - Get order book
    const kalshi = new KalshiExchange();
    const kalshiMarkets = await kalshi.getMarketsBySlug('KXFEDCHAIRNOM-29');
    const warshMarket = kalshiMarkets.find(m => m.outcomes[0].label.includes('Kevin Warsh'));

    if (!warshMarket) {
        console.log('\n--- Kalshi Order Book ---');
        console.log('Kevin Warsh market not found');
        return;
    }

    console.log('\n--- Kalshi Order Book ---');
    const kalshiBook = await kalshi.getOrderBook(warshMarket.id);
    console.log('Asks:');
    kalshiBook.asks.slice(0, 3).forEach((ask, i) => {
        console.log(`  ${i + 1}. Price: $${ask.price.toFixed(2)} | Size: ${ask.size.toLocaleString()}`);
    });
    console.log('Bids:');
    kalshiBook.bids.slice(0, 3).forEach((bid, i) => {
        console.log(`  ${i + 1}. Price: $${bid.price.toFixed(2)} | Size: ${bid.size.toLocaleString()}`);
    });
};

main();
