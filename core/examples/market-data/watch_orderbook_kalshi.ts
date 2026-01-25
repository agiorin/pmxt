import pmxt from '../../src';

async function run() {
    const ticker = "KXSERIEAGAME-26JAN25JUVNAP-JUV";
    const title = "Juventus vs Napoli (Juventus Win)";

    console.log(`Watching equilibrium for: ${title}`);
    console.log(`Ticker: ${ticker}\n`);

    const api = new pmxt.kalshi({
        credentials: {
            apiKey: process.env.KALSHI_API_KEY,
            privateKey: process.env.KALSHI_PRIVATE_KEY
        }
    });

    try {
        while (true) {
            const book = await api.watchOrderBook(ticker);

            console.clear();
            console.log(`Market: ${title}`);
            console.log(`Ticker: ${ticker} | Time: ${new Date().toLocaleTimeString()}\n`);

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
    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await api.close();
    }
}

run().catch(console.error);
