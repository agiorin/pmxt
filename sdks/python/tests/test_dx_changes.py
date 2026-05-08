"""
Targeted tests for DX changes:
1. Passthrough converters (auto_convert, fields survive)
2. Python backwards compat shim (id= keyword still works)
3. outcomeId param rename
4. resolveOutcomeId accepts MarketOutcome objects
"""

import warnings
import pytest
from pmxt import Polymarket
from pmxt.models import MarketOutcome


@pytest.fixture(scope="module")
def poly():
    return Polymarket()


@pytest.fixture(scope="module")
def sample_market(poly):
    try:
        markets = poly.fetch_markets(limit=1)
        if markets:
            return markets[0]
    except Exception:
        pass
    return None


@pytest.fixture(scope="module")
def server_available(sample_market):
    return sample_market is not None


# ---------------------------------------------------------------
# 1. Passthrough converters
# ---------------------------------------------------------------
class TestPassthroughConverters:
    def test_fetch_markets_returns_all_fields(self, poly, sample_market, server_available):
        if not server_available:
            pytest.skip("Sidecar not available")

        assert sample_market.market_id is not None
        assert sample_market.title is not None
        assert isinstance(sample_market.title, str)
        assert sample_market.outcomes is not None
        assert len(sample_market.outcomes) > 0
        assert isinstance(sample_market.volume_24h, (int, float))
        assert isinstance(sample_market.liquidity, (int, float))

    def test_outcome_fields_present(self, sample_market, server_available):
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome = sample_market.outcomes[0]
        assert outcome.outcome_id is not None
        assert isinstance(outcome.price, (int, float))
        assert outcome.label is not None

    def test_fetch_order_book_returns_bids_asks(self, poly, sample_market, server_available):
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome_id = sample_market.outcomes[0].outcome_id
        book = poly.fetch_order_book(outcome_id)
        assert book.bids is not None
        assert book.asks is not None
        assert isinstance(book.bids, list)
        assert isinstance(book.asks, list)


# ---------------------------------------------------------------
# 2. Python backwards compat shim
# ---------------------------------------------------------------
class TestBackwardsCompat:
    def test_fetch_order_book_old_id_keyword(self, poly, sample_market, server_available):
        """Old callers using id= keyword should still work with deprecation warning."""
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome_id = sample_market.outcomes[0].outcome_id
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            book = poly.fetch_order_book(id=outcome_id)
            assert book.bids is not None
            assert len(w) == 1
            assert issubclass(w[0].category, DeprecationWarning)
            assert "deprecated" in str(w[0].message).lower()

    def test_fetch_ohlcv_old_id_keyword(self, poly, sample_market, server_available):
        """Old callers using id= keyword for fetch_ohlcv should still work."""
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome_id = sample_market.outcomes[0].outcome_id
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            candles = poly.fetch_ohlcv(id=outcome_id, resolution="1d", limit=3)
            assert isinstance(candles, list)
            assert len(w) == 1
            assert issubclass(w[0].category, DeprecationWarning)

    def test_positional_still_works(self, poly, sample_market, server_available):
        """Positional args should work without any deprecation warning."""
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome_id = sample_market.outcomes[0].outcome_id
        with warnings.catch_warnings(record=True) as w:
            warnings.simplefilter("always")
            book = poly.fetch_order_book(outcome_id)
            assert book.bids is not None
            assert len(w) == 0

    def test_both_id_and_outcome_id_raises(self, poly, sample_market, server_available):
        """Passing both id= and outcome_id= should raise TypeError."""
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome_id = sample_market.outcomes[0].outcome_id
        with pytest.raises(TypeError, match="Cannot pass both"):
            poly.fetch_order_book(outcome_id=outcome_id, id=outcome_id)

    def test_missing_both_raises(self, poly, server_available):
        """Passing neither should raise TypeError."""
        if not server_available:
            pytest.skip("Sidecar not available")

        with pytest.raises(TypeError, match="Missing required"):
            poly.fetch_order_book()


# ---------------------------------------------------------------
# 3. outcomeId param rename
# ---------------------------------------------------------------
class TestOutcomeIdRename:
    def test_fetch_order_book_with_outcome_id(self, poly, sample_market, server_available):
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome_id = sample_market.outcomes[0].outcome_id
        book = poly.fetch_order_book(outcome_id=outcome_id)
        assert book.bids is not None
        assert book.asks is not None

    def test_fetch_ohlcv_with_outcome_id(self, poly, sample_market, server_available):
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome_id = sample_market.outcomes[0].outcome_id
        candles = poly.fetch_ohlcv(outcome_id=outcome_id, resolution="1d", limit=5)
        assert isinstance(candles, list)


# ---------------------------------------------------------------
# 4. resolveOutcomeId accepts MarketOutcome
# ---------------------------------------------------------------
class TestMarketOutcomeAcceptance:
    def test_fetch_order_book_accepts_market_outcome(self, poly, sample_market, server_available):
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome: MarketOutcome = sample_market.outcomes[0]
        book = poly.fetch_order_book(outcome)
        assert book.bids is not None

    def test_fetch_ohlcv_accepts_market_outcome(self, poly, sample_market, server_available):
        if not server_available:
            pytest.skip("Sidecar not available")

        outcome: MarketOutcome = sample_market.outcomes[0]
        candles = poly.fetch_ohlcv(outcome, resolution="1d", limit=3)
        assert isinstance(candles, list)
