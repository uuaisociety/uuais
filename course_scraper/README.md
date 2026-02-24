# Setup
To set up the scraper you need to:
1. Install the dependencies using UV
2. Add API keys
3. Run the scraper


## 1. Install Dependencies
Create virtual environement of choice and install the dependencies using UV
```bash
uv sync
```

## 2. Add API keys
Add the following API keys to the `api_keys` folder next to this file, names must match exactly
- `google_ai_key` - Google AI API key
- `uuais-dev-firebase-adminsdk-fbsvc-8dcd10358a.json` - Firebase service account key

TODO: Add simple switch between development/production service account key and don't harcode the name.
TODO: Switch to using Openrouter and development/production keys

## 3. Run the scraper
```bash
python3 main.py
```