import pmxt from '../../src';

async function run() {
    const assetId = "16206267440377108972343351482425564384973031696941663558076310969498822538172";
    const question = "Will Trump nominate Rick Rieder as the next Fed chair?";

    console.log(`Watching equilibrium for: ${question}`);
    console.log(`Outcome: YES (Asset ID: ${assetId})\n`);

    const api = new pmxt.polymarket();

    while (true) {
        const book = await api.watchOrderBook(assetId);

        console.clear();
        console.log(`Market: ${question}`);
        console.log(`Outcome: YES | Time: ${new Date().toLocaleTimeString()}\n`);

        console.log("--- ASKS (Sellers) ---");
        const topAsks = book.asks.slice(0, 5).reverse();
        topAsks.forEach(a => console.log(`  $${a.price.toFixed(3)} | ${a.size.toLocaleString().padStart(10)}`));

        if (book.asks[0] && book.bids[0]) {
            const spread = book.asks[0].price - book.bids[0].price;
            const mid = (book.asks[0].price + book.bids[0].price) / 2;
            console.log(`\n>> SPREAD: ${spread.toFixed(3)} | MID: $${mid.toFixed(3)} <<\n`);
        } else {
            console.log("\n--- SPREAD N/A ---\n");
        }

        console.log("--- BIDS (Buyers) ---");
        const topBids = book.bids.slice(0, 5);
        topBids.forEach(b => console.log(`  $${b.price.toFixed(3)} | ${b.size.toLocaleString().padStart(10)}`));

        console.log("\n(Watching live updates...)");
    }
}

run().catch(console.error);
