# Northstar

Opportunity intelligence and signals for high-schoolers. The HTML page is generated directly from spreadsheet data (supporting both the repository's [opportunities.csv](opportunities.csv) and live Google Sheets), with interactive client-side search, filtering, and sorting.

---

## Spreadsheet Data Sources

The site supports two spreadsheet sources:

1. **Local CSV file (Default)**: [opportunities.csv](opportunities.csv) in the repository.
2. **Google Sheets (Live)**: Any Google Sheet published to the web as a CSV link, configured via the `SPREADSHEET_URL` environment variable.

### Spreadsheet Columns

Keep the header row and these columns:

```text
title,org,type,tag,time,mode,description,audience,region,deadline,url
```

- Fields containing commas should be wrapped in double quotes.
- `deadline` should use `YYYY-MM-DD`; leave it blank for opportunities with no deadline.
- `audience` values: `Selective` or `Open to all high-schoolers`.
- `region` values: `US-only`, `UK-only`, or `Global`.
- URLs open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`.

---

## Deploy to Cloudflare Pages

1. In the **Cloudflare Dashboard**, navigate to **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
2. Select your repository.
3. Configure the build settings:
   - **Framework preset**: `None`
   - **Build command**: `npm run build`
   - **Build output directory**: `.`
4. *(Optional — Google Sheets)*: Under **Settings** > **Environment variables**, add:
   - Variable name: `SPREADSHEET_URL`
   - Value: Your published Google Sheets CSV URL.

Every time you commit changes (or trigger a deploy hook), Cloudflare Pages runs the build script, fetches the spreadsheet, pre-renders the HTML cards, and deploys the static site globally.

---

## Using Google Sheets

To use Google Sheets as your live CMS:

1. Create or open your sheet with the columns: `title,org,type,tag,time,mode,description,audience,region,deadline,url`.
2. Go to **File** > **Share** > **Publish to web**.
3. Choose the sheet tab you want to publish, and select **Comma-separated values (.csv)** instead of Web page.
4. Click **Publish** and copy the resulting URL.
5. Set `SPREADSHEET_URL` in your Cloudflare Pages dashboard environment variables (or in your local environment when building).

---

## Run & Build Locally

### Build the HTML page
```bash
npm run build
```
This reads `opportunities.csv` (or `SPREADSHEET_URL` if defined), sorts by deadline, pre-renders all cards into [index.html](index.html), and embeds the JSON data for client-side hydration.

To build with a Google Sheets URL locally:
```bash
SPREADSHEET_URL="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv" npm run build
```

### Start the local preview server
```bash
npm start
```
Open `http://localhost:8000` in your browser.

---

## Opportunity Submissions

The submission form posts to the URL configured in the form's `data-endpoint` attribute in [index.html](index.html).

Deploy the included [worker.js](worker.js) with Wrangler, then set that attribute to the deployed Worker URL. The Worker sends each submission through Resend:

```bash
npm install -g wrangler
wrangler secret put RESEND_API_KEY
wrangler deploy
```

- `EMAIL_FROM` must use a domain verified in Resend.
- `EMAIL_TO` is the inbox that receives submissions.
- `ALLOWED_ORIGIN` is the site's origin (e.g. `https://your-site.pages.dev`).