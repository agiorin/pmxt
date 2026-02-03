import pmxt

def main():
    # Kalshi
    kalshi = pmxt.Kalshi()
    k_event = kalshi.fetch_events(query="Fed Chair")[0]
    k_market = k_event.search_markets("Kevin Warsh")[0]

    k_trades = kalshi.fetch_trades(k_market.yes.id, pmxt.HistoryFilterParams(resolution='1h', limit=10))
    print('Kalshi:', k_trades)

    # Polymarket
    poly = pmxt.Polymarket()
    p_event = poly.fetch_events(query='Fed Chair')[0]
    p_market = p_event.search_markets('Kevin Warsh')[0]

    p_trades = poly.fetch_trades(p_market.yes.id, pmxt.HistoryFilterParams(resolution='1h', limit=10))
    print('Polymarket:', p_trades)

if __name__ == "__main__":
    main()
