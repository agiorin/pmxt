import { RequestOptions } from "./models.js";

export function buildArgsWithOptionalOptions(
    primary?: any,
    options?: RequestOptions,
): any[] {
    if (options !== undefined) {
        return [primary ?? null, options];
    }
    return primary !== undefined ? [primary] : [];
}

export function withTrailingOptions(
    args: any[],
    options: RequestOptions | undefined,
    optionalArgCount: number,
): any[] {
    if (options === undefined) {
        return args;
    }

    while (args.length < optionalArgCount) {
        args.push(null);
    }

    args.push(options);
    return args;
}

