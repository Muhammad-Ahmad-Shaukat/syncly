# Syncly backend (Express + Sequelize + MySQL)

## Demo data seed

With MySQL running and `.env` configured (see `.env.example`), run:

```bash
npm run seed:demo
```

Creates or updates a demo merchant (`demo@syncly.dev` by default), two stores, and up to 50 products / 100 orders. Override with `SEED_DEMO_EMAIL`, `SEED_DEMO_PASSWORD`, `SEED_DEMO_USERNAME` if needed.

For new columns after pulls, set `DB_SYNC_ALTER=true` once in development so Sequelize can alter tables, then turn it off.
