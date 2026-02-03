import { exchangeClasses, validateUnifiedEvent } from './shared';

describe('Compliance: searchEvents', () => {
    test.each(exchangeClasses)('$name should comply with searchEvents standards (deprecated)', async ({ name, cls }) => {
        const exchange = new cls();

        try {
            // Use a query likely to return results for most prediction markets
            const query = 'Trump';
            const events = await exchange.searchEvents(query, { limit: 5 });

            expect(events).toBeDefined();
            expect(Array.isArray(events)).toBe(true);
            expect(events!.length).toBeGreaterThan(0);

            for (const event of events!) {
                validateUnifiedEvent(event, name);
            }
        } catch (error: any) {
            if (error.message.toLowerCase().includes('not implemented')) {
                console.info(`[Compliance] ${name}.searchEvents not implemented.`);
                return;
            }
            throw error;
        }
    }, 30000);

    test.each(exchangeClasses)('$name should comply with fetchEvents({ query }) standards', async ({ name, cls }) => {
        const exchange = new cls();

        try {
            // Use a query likely to return results for most prediction markets
            const query = 'Trump';
            const events = await exchange.fetchEvents({ query, limit: 5 });

            expect(events).toBeDefined();
            expect(Array.isArray(events)).toBe(true);
            expect(events!.length).toBeGreaterThan(0);

            for (const event of events!) {
                validateUnifiedEvent(event, name);
            }
        } catch (error: any) {
            if (error.message.toLowerCase().includes('not implemented')) {
                console.info(`[Compliance] ${name}.fetchEvents({ query }) not implemented.`);
                return;
            }
            throw error;
        }
    }, 30000);
});
