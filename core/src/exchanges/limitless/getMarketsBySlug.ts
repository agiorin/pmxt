import axios from 'axios';
import { UnifiedMarket } from '../../types';
import { LIMITLESS_API_URL, mapMarketToUnified } from './utils';

/**
 * Fetch a specific market by its URL slug.
 * @param slug - The market slug
 */
export async function getMarketsBySlug(slug: string): Promise<UnifiedMarket[]> {
    try {
        const response = await axios.get(`${LIMITLESS_API_URL}/markets/${slug}`);
        const market = response.data;

        if (!market) return [];

        const unifiedMarket = mapMarketToUnified(market);
        return unifiedMarket ? [unifiedMarket] : [];

    } catch (error) {
        console.error(`Error fetching Limitless slug ${slug}:`, error);
        return [];
    }
}
