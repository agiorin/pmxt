import {
    Connection,
    PublicKey,
    Transaction,
    TransactionInstruction,
    SystemProgram,
} from '@solana/web3.js';
import {
    PredictionMarketExchange,
    MarketFetchParams,
    EventFetchParams,
    OHLCVParams,
    HistoryFilterParams,
    TradesParams,
    ExchangeCredentials,
} from '../../BaseExchange';
import {
    UnifiedMarket,
    UnifiedEvent,
    PriceCandle,
    OrderBook,
    Trade,
    Order,
    Position,
    Balance,
    CreateOrderParams,
} from '../../types';
import { AuthenticationError, InvalidOrder, ExchangeNotAvailable } from '../../errors';
import { fetchMarkets } from './fetchMarkets';
import { fetchEvents } from './fetchEvents';
import { fetchOHLCV } from './fetchOHLCV';
import { fetchOrderBook } from './fetchOrderBook';
import { fetchTrades } from './fetchTrades';
import { BaoziAuth } from './auth';
import { BaoziWebSocket } from './websocket';
import { baoziErrorMapper } from './errors';
import {
    PROGRAM_ID,
    LAMPORTS_PER_SOL,
    USER_POSITION_DISCRIMINATOR_BS58,
    RACE_POSITION_DISCRIMINATOR_BS58,
    PLACE_BET_SOL_DISCRIMINATOR,
    BET_ON_RACE_OUTCOME_SOL_DISCRIMINATOR,
    parseUserPosition,
    parseRacePosition,
    parseMarket,
    parseRaceMarket,
    mapBooleanToUnified,
    mapRaceToUnified,
    deriveConfigPda,
    deriveMarketPda,
    derivePositionPda,
    deriveRaceMarketPda,
    deriveRacePositionPda,
} from './utils';

export interface BaoziExchangeOptions {
    credentials?: ExchangeCredentials;
    rpcUrl?: string;
}

export class BaoziExchange extends PredictionMarketExchange {
    private auth?: BaoziAuth;
    private connection: Connection;
    private ws?: BaoziWebSocket;

    constructor(options?: ExchangeCredentials | BaoziExchangeOptions) {
        let credentials: ExchangeCredentials | undefined;
        let rpcUrl: string | undefined;

        if (options && 'credentials' in options) {
            credentials = options.credentials;
            rpcUrl = (options as BaoziExchangeOptions).rpcUrl;
        } else {
            credentials = options as ExchangeCredentials | undefined;
        }

        super(credentials);

        rpcUrl = rpcUrl
            || process.env.BAOZI_RPC_URL
            || process.env.HELIUS_RPC_URL
            || 'https://api.mainnet-beta.solana.com';

        this.connection = new Connection(rpcUrl, 'confirmed');

        if (credentials?.privateKey) {
            this.auth = new BaoziAuth(credentials);
        }
    }

    get name(): string {
        return 'Baozi';
    }

    // -----------------------------------------------------------------------
    // Market Data
    // -----------------------------------------------------------------------

    protected async fetchMarketsImpl(params?: MarketFetchParams): Promise<UnifiedMarket[]> {
        return fetchMarkets(this.connection, params);
    }

    protected async fetchEventsImpl(params: EventFetchParams): Promise<UnifiedEvent[]> {
        return fetchEvents(this.connection, params);
    }

    async fetchOHLCV(): Promise<PriceCandle[]> {
        return fetchOHLCV();
    }

    async fetchOrderBook(id: string): Promise<OrderBook> {
        return fetchOrderBook(this.connection, id);
    }

    async fetchTrades(): Promise<Trade[]> {
        return fetchTrades();
    }

    // -----------------------------------------------------------------------
    // User Data
    // -----------------------------------------------------------------------

    async fetchBalance(): Promise<Balance[]> {
        try {
            const auth = this.ensureAuth();
            const lamports = await this.connection.getBalance(auth.getPublicKey());
            const solBalance = lamports / LAMPORTS_PER_SOL;

            return [{
                currency: 'SOL',
                total: solBalance,
                available: solBalance,
                locked: 0,
            }];
        } catch (error: any) {
            throw baoziErrorMapper.mapError(error);
        }
    }

    async fetchPositions(): Promise<Position[]> {
        try {
            const auth = this.ensureAuth();
            const userPubkey = auth.getPublicKey();

            // Fetch boolean and race positions in parallel
            const [booleanPositions, racePositions] = await Promise.all([
                this.connection.getProgramAccounts(PROGRAM_ID, {
                    filters: [
                        { memcmp: { offset: 0, bytes: USER_POSITION_DISCRIMINATOR_BS58 } },
                        { memcmp: { offset: 8, bytes: userPubkey.toBase58() } },
                    ],
                }),
                this.connection.getProgramAccounts(PROGRAM_ID, {
                    filters: [
                        { memcmp: { offset: 0, bytes: RACE_POSITION_DISCRIMINATOR_BS58 } },
                        { memcmp: { offset: 8, bytes: userPubkey.toBase58() } },
                    ],
                }),
            ]);

            const positions: Position[] = [];

            // Process boolean positions
            for (const account of booleanPositions) {
                try {
                    const pos = parseUserPosition(account.account.data);
                    if (pos.claimed) continue;

                    // Try to fetch the market to get current prices
                    const marketPda = deriveMarketPda(pos.marketId);
                    let currentYesPrice = 0.5;
                    let currentNoPrice = 0.5;
                    let marketTitle = `Market #${pos.marketId}`;

                    try {
                        const marketInfo = await this.connection.getAccountInfo(marketPda);
                        if (marketInfo) {
                            const market = parseMarket(marketInfo.data);
                            const unified = mapBooleanToUnified(market, marketPda.toString());
                            currentYesPrice = unified.yes?.price ?? 0.5;
                            currentNoPrice = unified.no?.price ?? 0.5;
                            marketTitle = market.question;
                        }
                    } catch {
                        // Use defaults if market fetch fails
                    }

                    const yesSOL = Number(pos.yesAmount) / LAMPORTS_PER_SOL;
                    const noSOL = Number(pos.noAmount) / LAMPORTS_PER_SOL;

                    if (yesSOL > 0) {
                        positions.push({
                            marketId: marketPda.toString(),
                            outcomeId: `${marketPda.toString()}-YES`,
                            outcomeLabel: 'Yes',
                            size: yesSOL,
                            entryPrice: 0, // Not tracked on-chain for pari-mutuel
                            currentPrice: currentYesPrice,
                            unrealizedPnL: 0, // Pari-mutuel doesn't have fixed unrealized P&L
                        });
                    }

                    if (noSOL > 0) {
                        positions.push({
                            marketId: marketPda.toString(),
                            outcomeId: `${marketPda.toString()}-NO`,
                            outcomeLabel: 'No',
                            size: noSOL,
                            entryPrice: 0,
                            currentPrice: currentNoPrice,
                            unrealizedPnL: 0,
                        });
                    }
                } catch {
                    // Skip malformed position accounts
                }
            }

            // Process race positions
            for (const account of racePositions) {
                try {
                    const pos = parseRacePosition(account.account.data);
                    if (pos.claimed) continue;

                    const racePda = deriveRaceMarketPda(pos.marketId);

                    for (let i = 0; i < pos.bets.length; i++) {
                        const betSOL = Number(pos.bets[i]) / LAMPORTS_PER_SOL;
                        if (betSOL <= 0) continue;

                        positions.push({
                            marketId: racePda.toString(),
                            outcomeId: `${racePda.toString()}-${i}`,
                            outcomeLabel: `Outcome ${i}`,
                            size: betSOL,
                            entryPrice: 0,
                            currentPrice: 0,
                            unrealizedPnL: 0,
                        });
                    }
                } catch {
                    // Skip malformed position accounts
                }
            }

            return positions;
        } catch (error: any) {
            throw baoziErrorMapper.mapError(error);
        }
    }

    // -----------------------------------------------------------------------
    // Trading
    // -----------------------------------------------------------------------

    async createOrder(params: CreateOrderParams): Promise<Order> {
        try {
            const auth = this.ensureAuth();
            const keypair = auth.getKeypair();
            const outcomeId = params.outcomeId;

            // Determine if this is a boolean or race market bet
            const isYes = outcomeId.endsWith('-YES');
            const isNo = outcomeId.endsWith('-NO');
            const isBoolean = isYes || isNo;

            // Amount in lamports
            const amountLamports = BigInt(Math.round(params.amount * LAMPORTS_PER_SOL));

            let ix: TransactionInstruction;

            if (isBoolean) {
                // Build place_bet_sol instruction
                const marketPubkey = new PublicKey(outcomeId.replace(/-YES$|-NO$/, ''));

                // Fetch market to get market_id
                const marketInfo = await this.connection.getAccountInfo(marketPubkey);
                if (!marketInfo) throw new Error(`Market not found: ${marketPubkey}`);
                const market = parseMarket(marketInfo.data);

                const configPda = deriveConfigPda();
                const positionPda = derivePositionPda(market.marketId, keypair.publicKey);

                // Instruction data: discriminator(8) + outcome(1 bool) + amount(8 u64)
                const data = Buffer.alloc(17);
                PLACE_BET_SOL_DISCRIMINATOR.copy(data, 0);
                data.writeUInt8(isYes ? 1 : 0, 8); // outcome: true=YES, false=NO
                data.writeBigUInt64LE(amountLamports, 9);

                ix = new TransactionInstruction({
                    programId: PROGRAM_ID,
                    keys: [
                        { pubkey: configPda, isSigner: false, isWritable: false },
                        { pubkey: marketPubkey, isSigner: false, isWritable: true },
                        { pubkey: positionPda, isSigner: false, isWritable: true },
                        { pubkey: PROGRAM_ID, isSigner: false, isWritable: false }, // whitelist (optional → pass program ID)
                        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    ],
                    data,
                });
            } else {
                // Build bet_on_race_outcome_sol instruction
                const parts = outcomeId.split('-');
                const outcomeIndex = parseInt(parts[parts.length - 1], 10);
                const marketPubkey = new PublicKey(parts.slice(0, -1).join('-'));

                // Fetch race market to get market_id
                const marketInfo = await this.connection.getAccountInfo(marketPubkey);
                if (!marketInfo) throw new Error(`Race market not found: ${marketPubkey}`);
                const raceMarket = parseRaceMarket(marketInfo.data);

                if (outcomeIndex >= raceMarket.outcomeCount) {
                    throw new InvalidOrder(
                        `Outcome index ${outcomeIndex} exceeds market outcome count ${raceMarket.outcomeCount}`,
                        'Baozi',
                    );
                }

                const configPda = deriveConfigPda();
                const racePositionPda = deriveRacePositionPda(raceMarket.marketId, keypair.publicKey);

                // Instruction data: discriminator(8) + outcome_index(1 u8) + amount(8 u64)
                const data = Buffer.alloc(17);
                BET_ON_RACE_OUTCOME_SOL_DISCRIMINATOR.copy(data, 0);
                data.writeUInt8(outcomeIndex, 8);
                data.writeBigUInt64LE(amountLamports, 9);

                ix = new TransactionInstruction({
                    programId: PROGRAM_ID,
                    keys: [
                        { pubkey: configPda, isSigner: false, isWritable: false },
                        { pubkey: marketPubkey, isSigner: false, isWritable: true },
                        { pubkey: racePositionPda, isSigner: false, isWritable: true },
                        { pubkey: PROGRAM_ID, isSigner: false, isWritable: false }, // whitelist (optional)
                        { pubkey: keypair.publicKey, isSigner: true, isWritable: true },
                        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
                    ],
                    data,
                });
            }

            // Build, sign, and send transaction
            const tx = new Transaction().add(ix);
            const { blockhash } = await this.connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = keypair.publicKey;
            tx.sign(keypair);

            const signature = await this.connection.sendRawTransaction(tx.serialize());
            await this.connection.confirmTransaction(signature, 'confirmed');

            return {
                id: signature,
                marketId: params.marketId,
                outcomeId: params.outcomeId,
                side: 'buy',
                type: 'market', // Pari-mutuel bets are always instant
                price: undefined,
                amount: params.amount,
                status: 'filled', // Pari-mutuel bets fill instantly
                filled: params.amount,
                remaining: 0,
                timestamp: Date.now(),
            };
        } catch (error: any) {
            throw baoziErrorMapper.mapError(error);
        }
    }

    async cancelOrder(): Promise<Order> {
        throw new InvalidOrder(
            'Pari-mutuel bets are irrevocable and cannot be cancelled',
            'Baozi',
        );
    }

    async fetchOrder(orderId: string): Promise<Order> {
        // In pari-mutuel, there are no pending orders. The "order" is the tx signature.
        // We can verify the transaction was confirmed.
        try {
            const tx = await this.connection.getTransaction(orderId, {
                maxSupportedTransactionVersion: 0,
            });

            if (!tx) {
                throw new Error(`Transaction not found: ${orderId}`);
            }

            return {
                id: orderId,
                marketId: 'unknown',
                outcomeId: 'unknown',
                side: 'buy',
                type: 'market',
                amount: 0,
                status: tx.meta?.err ? 'rejected' : 'filled',
                filled: 0,
                remaining: 0,
                timestamp: (tx.blockTime || 0) * 1000,
            };
        } catch (error: any) {
            throw baoziErrorMapper.mapError(error);
        }
    }

    async fetchOpenOrders(): Promise<Order[]> {
        // Pari-mutuel bets execute instantly — there are never open orders
        return [];
    }

    // -----------------------------------------------------------------------
    // WebSocket
    // -----------------------------------------------------------------------

    async watchOrderBook(id: string): Promise<OrderBook> {
        if (!this.ws) {
            this.ws = new BaoziWebSocket();
        }
        return this.ws.watchOrderBook(this.connection, id);
    }

    async watchTrades(): Promise<Trade[]> {
        throw new ExchangeNotAvailable('Trade streaming is not available for Baozi', 'Baozi');
    }

    async close(): Promise<void> {
        if (this.ws) {
            await this.ws.close(this.connection);
            this.ws = undefined;
        }
    }

    // -----------------------------------------------------------------------
    // Private Helpers
    // -----------------------------------------------------------------------

    private ensureAuth(): BaoziAuth {
        if (!this.auth) {
            throw new AuthenticationError(
                'Trading operations require authentication. ' +
                'Initialize BaoziExchange with credentials: new BaoziExchange({ privateKey: "base58..." })',
                'Baozi',
            );
        }
        return this.auth;
    }
}
