import { UnifiedMarket, MarketOutcome } from "../../types";
import { addBinaryOutcomes } from "../../utils/market-utils";

/**
 * Base URL passed to parseOpenApiSpec to override the spec's servers[0].url.
 * The generated api.ts already has "https://www.metaculus.com/api" as its server URL,
 * so this constant must match exactly — do NOT add a trailing slash or path suffix.
 * Paths in the spec (/posts/, /posts/{postId}/) are appended directly by BaseExchange.
 */
export const BASE_URL = "https://www.metaculus.com/api";

/**
 * Map a Metaculus post `status` to pmxt unified status.
 *
 * Metaculus post statuses: "open", "closed", "resolved", "upcoming"
 */
export function mapStatus(status: string): "active" | "closed" {
    switch ((status ?? "").toLowerCase()) {
        case "open":
        case "upcoming":
            return "active";
        default:
            return "closed";
    }
}

/**
 * Extract the community prediction probability from a Metaculus Post (v3 API).
 *
 * For all question types the recency-weighted aggregation exposes a `centers`
 * array where `centers[0]` is the median / central estimate, already normalised
 * to [0, 1] by the API.
 *
 * @returns A number in [0, 1], or 0.5 if no prediction is available.
 */
function extractCommunityProbability(post: any): number {
    const latest =
        post?.question?.aggregations?.recency_weighted?.latest;

    if (!latest) return 0.5;

    const centers: number[] | undefined = latest.centers;
    if (Array.isArray(centers) && centers.length > 0 && typeof centers[0] === "number") {
        return Math.max(0, Math.min(1, centers[0]));
    }

    // Fallback: some binary posts expose forecast_values[0] as the Yes probability
    const fv: number[] | undefined = latest.forecast_values;
    if (Array.isArray(fv) && fv.length > 0 && typeof fv[0] === "number") {
        return Math.max(0, Math.min(1, fv[0]));
    }

    return 0.5;
}

/**
 * Build the tag list from a Post's project associations.
 * Combines taxonomy tags and categories so consumers can filter by either.
 */
function buildTags(post: any): string[] {
    const tags: string[] = [];
    const projects = post?.projects ?? {};

    // Explicit tags
    const tagList: any[] = projects.tag ?? [];
    for (const t of tagList) {
        const label = typeof t === "string" ? t : t?.name;
        if (label && !tags.includes(label)) tags.push(label);
    }

    // Categories (useful for broad filtering)
    const catList: any[] = projects.category ?? [];
    for (const c of catList) {
        const label = typeof c === "string" ? c : c?.name;
        if (label && !tags.includes(label)) tags.push(label);
    }

    // Question type as a tag for easy filtering
    const qType = post?.question?.type;
    if (qType && !tags.includes(qType)) tags.push(qType);

    return tags;
}

/**
 * Build outcomes for a Metaculus Post question.
 *
 * - Binary → Yes / No
 * - Multiple-choice → one outcome per option string
 * - Continuous / numeric / date → synthetic "Higher" / "Lower" relative to the
 *   community-prediction median (centers[0] is already 0–1 normalised)
 *
 * Raw aggregation data is exposed in each outcome's `metadata` so consumers
 * can use it directly.
 */
function buildOutcomes(post: any, medianProb: number): MarketOutcome[] {
    const question = post?.question ?? {};
    const id = String(post.id);
    const type = (question.type || "binary").toLowerCase();

    const latest = question.aggregations?.recency_weighted?.latest ?? null;
    const sharedMeta = {
        question_type: type,
        aggregations: latest,
        resolution: question.resolution ?? null,
        scaling: question.scaling ?? null,
        possibilities: question.possibilities ?? null,
    };

    // Multiple choice
    if (type === "multiple_choice") {
        const options: any[] = question.options ?? [];
        if (options.length > 0) {
            // The histogram array in `latest` (if present) gives per-option probabilities
            const histogram: number[] | undefined = latest?.histogram ?? undefined;
            return options.map((opt: any, idx: number) => {
                const label =
                    typeof opt === "string"
                        ? opt
                        : opt?.label ?? opt?.value ?? `Option ${idx + 1}`;
                const price =
                    Array.isArray(histogram) && typeof histogram[idx] === "number"
                        ? Math.max(0, Math.min(1, histogram[idx]))
                        : 1 / Math.max(options.length, 1);
                return {
                    outcomeId: `${id}-${idx}`,
                    marketId: id,
                    label,
                    price,
                    priceChange24h: 0,
                    metadata: { ...sharedMeta, choice_index: idx },
                } as MarketOutcome;
            });
        }
    }

    // Binary
    if (type === "binary") {
        return [
            {
                outcomeId: `${id}-YES`,
                marketId: id,
                label: "Yes",
                price: medianProb,
                priceChange24h: 0,
                metadata: sharedMeta,
            },
            {
                outcomeId: `${id}-NO`,
                marketId: id,
                label: "No",
                price: Math.max(0, Math.min(1, 1 - medianProb)),
                priceChange24h: 0,
                metadata: sharedMeta,
            },
        ];
    }

    // Continuous / numeric / date — centers[0] is the normalised median
    return [
        {
            outcomeId: `${id}-HIGHER`,
            marketId: id,
            label: "Higher",
            price: medianProb,
            priceChange24h: 0,
            metadata: sharedMeta,
        },
        {
            outcomeId: `${id}-LOWER`,
            marketId: id,
            label: "Lower",
            price: Math.max(0, Math.min(1, 1 - medianProb)),
            priceChange24h: 0,
            metadata: sharedMeta,
        },
    ];
}

/**
 * Convert a raw Metaculus Post (v3 /api/posts/ response item) into a
 * `UnifiedMarket`.
 *
 * @param post      Raw post object from the Metaculus API.
 * @param eventId   Optional parent event ID (tournament slug) to override
 *                  the value derived from post.projects.tournament.
 */
export function mapMarketToUnified(post: any, eventId?: string): UnifiedMarket | null {
    if (!post || !post.id) return null;

    const id = String(post.id);
    const medianProb = extractCommunityProbability(post);
    const outcomes = buildOutcomes(post, medianProb);

    // Resolution date — prefer scheduled_resolve_time, fall back to close time
    const resolveDateStr =
        post.scheduled_resolve_time ??
        post.question?.scheduled_resolve_time ??
        post.scheduled_close_time ??
        post.actual_close_time;
    const resolutionDate = resolveDateStr
        ? new Date(resolveDateStr)
        : new Date("2099-01-01T00:00:00Z");

    const tags = buildTags(post);

    // Primary category label
    const categoryList: any[] = post?.projects?.category ?? [];
    const category =
        categoryList.length > 0
            ? typeof categoryList[0] === "string"
                ? categoryList[0]
                : categoryList[0]?.name
            : undefined;

    // Forecaster count — proxy for liquidity (no monetary values on Metaculus)
    const forecastCount = Number(
        post.nr_forecasters ?? post.question?.nr_forecasters ?? 0,
    );

    // Derive eventId from first tournament slug if not explicitly provided
    const tournamentList: any[] = post?.projects?.tournament ?? [];
    const derivedEventId =
        tournamentList.length > 0
            ? typeof tournamentList[0] === "string"
                ? tournamentList[0]
                : tournamentList[0]?.slug
            : undefined;

    const resolvedEventId = eventId ?? derivedEventId;

    const um: UnifiedMarket = {
        marketId: id,
        eventId: resolvedEventId,
        title: post.title ?? post.question?.title ?? "",
        description:
            post.question?.description ??
            post.question?.resolution_criteria ??
            "",
        slug: post.slug ?? post.url_title ?? undefined,
        outcomes,
        resolutionDate,
        volume24h: 0,           // Metaculus has no monetary volume
        volume: 0,
        liquidity: forecastCount,   // re-purposed as forecaster count
        openInterest: forecastCount,
        url: `https://www.metaculus.com/questions/${id}/`,
        image: post.projects?.default_project?.header_image ?? undefined,
        category,
        tags,
    };

    addBinaryOutcomes(um);
    return um;
}
