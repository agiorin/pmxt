import pmxt from 'pmxtjs';

const main = async () => {
    // Kalshi
    const kalshi = new pmxt.Kalshi();
    const kEvent = (await kalshi.fetchEvents({ query: 'Fed Chair' }))[0];
    const kMarket = kEvent.searchMarkets('Kevin Warsh')[0];

    const kTrades = await kalshi.fetchTrades(kMarket.yes!.id, { limit: 10, resolution: '1m' });
    console.log('Kalshi:', kTrades);

    // Polymarket
    const poly = new pmxt.Polymarket();
    const pEvent = (await poly.fetchEvents({ query: 'Fed Chair' }))[0];
    const pMarket = pEvent.searchMarkets('Kevin Warsh')[0];

    // Use .yes.id for convenience
    const pTrades = await poly.fetchTrades(pMarket.yes!.id, { limit: 10, resolution: '1m' });
    console.log('Polymarket:', pTrades);
};

main();