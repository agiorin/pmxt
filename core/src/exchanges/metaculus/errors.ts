import { ErrorMapper } from '../../utils/error-mapper';
import { NotFound, MarketNotFound } from '../../errors';

/**
 * Metaculus-specific error mapper.
 *
 * The Metaculus API uses standard HTTP status codes.
 * 404s can mean either a question or a tournament was not found.
 */
export class MetaculusErrorMapper extends ErrorMapper {
    constructor() {
        super('Metaculus');
    }

    protected override mapNotFoundError(message: string, _data: any): NotFound {
        const lower = message.toLowerCase();
        if (lower.includes('question') || lower.includes('market')) {
            const match = message.match(/[\d]+/);
            const id = match ? match[0] : 'unknown';
            return new MarketNotFound(id, this.exchangeName);
        }
        return new NotFound(message, this.exchangeName);
    }
}

export const metaculusErrorMapper = new MetaculusErrorMapper();
