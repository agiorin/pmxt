import pmxt from '../../src';

async function run() {
    // Fetch the Rick Rieder market specifically
    const slug = 'will-trump-nominate-rick-rieder-as-the-next-fed-chair';
    const response = await fetch(`https://gamma-api.polymarket.com/markets?slug=${slug}`);
    const data = await response.json() as any[];
    const market = data[0];
    const assetId = JSON.parse(market.clobTokenIds)[0];

    console.log(`Watching trades for: ${market.question}`);
    console.log(`Outcome: YES (Asset ID: ${assetId})\n`);

    const api = new pmxt.polymarket();

    while (true) {
        const trades = await api.watchTrades(assetId);
        for (const trade of trades) {
            console.log(`[TRADE] ${trade.side.toUpperCase().padStart(4)} | ${trade.amount.toLocaleString().padStart(10)} shares @ $${trade.price.toFixed(3)} | ${new Date(trade.timestamp).toLocaleTimeString()}`);
        }
    }
}

run().catch(console.error);
