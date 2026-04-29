# ExNexus Hetzner Proxy

Fixed-IP request relay used by [ExNexus](https://exnexus.app) — an institutional-grade multi-exchange trading aggregator for crypto and stocks.

## What it does
Provides static-IP egress so that exchange API providers (e.g., Binance) can whitelist a single IP for our backend, rather than the dynamic IPs that Cloudflare Workers use by default.

Lightweight Node.js/Express service running on Hetzner VPS, fronted by Caddy for HTTPS termination and TLS auto-renewal.

## Architecture
