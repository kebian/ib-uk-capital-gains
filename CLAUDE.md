# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TypeScript/React web application for calculating UK capital gains tax from Interactive Brokers trading data. Implements HMRC rules for UK capital gains tax calculations on stock trades.

## Build Commands

```bash
npm run build    # Clean and compile TypeScript
npm run clean    # Remove dist/ directory
```

No test framework is configured (`npm test` is a no-op).

## Architecture

### Capital Gains Calculation Pipeline

```
CSV Import → StockTrade[] → Match Gains → Gain[] → React UI
```

### HMRC Matching Rules (Priority Order)

The matching engine in `src/capital-gains/stock-holding.ts` applies these rules sequentially:

1. **Same-Day Rule**: Match sells with buys on the same calendar day
2. **Bed & Breakfast Rule**: Match sells with buys within 30 days after the sale
3. **Section 104 Holding**: Pool remaining unmatched stock at average cost basis

Each sell transaction is processed through all applicable rules until fully allocated.

### Key Source Files

- `src/csv-import.ts` - Parses IB Flex Query CSVs (trades and corporate actions)
- `src/stock-trade.ts` - Core trade model with MD5 hashing for deduplication
- `src/capital-gains/match.ts` - Entry point for gain matching algorithm
- `src/capital-gains/stock-holding.ts` - Holds allocated trades and performs HMRC rule matching
- `src/capital-gains/section104.ts` - Section 104 pool implementation (pooled average cost)
- `src/accounting.tsx` - Main React component (file upload, year selector, display)

### Data Flow

1. User uploads trades CSV from Interactive Brokers Flex Query
2. CSV parsed into `StockTrade[]` array, deduplicated by MD5 hash
3. Trades stored in browser localStorage
4. Trades grouped by symbol into `StockHolding` instances
5. Each sell matched against buys using HMRC rules in priority order
6. Results displayed as capital gains table with matching details

### UK Tax Year

Financial years run April 6 to April 5. Year ranges defined in `src/accounting.tsx`.

## Code Conventions

- Strict TypeScript mode enabled
- React functional components
- Prettier for formatting (@adarna/prettier-config)
- Trade deduplication via MD5 hash of significant fields

## Corporate Actions

Handled types: stock splits (FS), reverse splits (RS), delistings (DW). Special cases:
- Reverse splits don't allocate against same-day purchases
- Zero-price sales allowed for write-offs
