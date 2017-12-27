# mintlite
This is a lightweight app Nikki and I use to manage our finances. It uses [Plaid](plaid.com) to fetch transactions from all our accounts and stores them in a private [Google Sheet](sheets.google.com) for tracking, etc.

## Components
1. A private Google Sheet where the transactions are stored (specified in `config.json`)
2. A GCP project and service account with access to the Google Sheet from (1) (specified in `google_secrets.json`)
3. A plaid app with `development` or `production` access and plaid `access_tokens` for the financial accounts (specified in `plaid_secrets.json` and `config.json`)
3. A `node` app that pulls new transactions and adds them to the Google Sheet on a regular interval with [Heroku Scheduler](https://elements.heroku.com/addons/scheduler)