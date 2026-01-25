import pmxt from '../../src';

async function run() {
    const assetId = "16206267440377108972343351482425564384973031696941663558076310969498822538172";
    const title = "Will Trump nominate Rick Rieder as the next Fed chair?";

    console.log(`Watching trades for: ${title}`);
    console.log(`Outcome: YES (Asset ID: ${assetId})\n`);

    const api = new pmxt.polymarket();

    try {
        while (true) {
            const trades = await api.watchTrades(assetId);
            for (const trade of trades) {
                console.log(`[TRADE] ${trade.side.toUpperCase().padStart(4)} | ${trade.amount.toLocaleString().padStart(10)} shares @ $${trade.price.toFixed(3)} | ${new Date(trade.timestamp).toLocaleTimeString()}`);
            }
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    } finally {
        await api.close();
    }
}

run().catch(console.error);
