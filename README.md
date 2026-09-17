# Northstar

Static opportunity finder for high-schoolers. The page content is generated from [opportunities.csv](opportunities.csv).

## Edit the opportunities

Update the CSV and reload the site. Keep the header row and these columns:

```text
title,org,type,tag,time,mode,description,audience,region,deadline,url
```

Fields containing commas should be wrapped in double quotes. `deadline` should use `YYYY-MM-DD`; leave it blank for opportunities with no deadline. The site loads the CSV in the browser, then uses it for cards, text search, filters, deadline sorting, and generator counts. Audience values are `Selective` or `Open to all high-schoolers`; region values are `US-only`, `UK-only`, or `Global`. URLs open in a new tab.

## Run locally

Because browsers block `fetch()` for local files, serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` after starting the server.

## Opportunity submissions

The submission form posts to the URL in the form's `data-endpoint` attribute in [index.html](index.html). Deploy the included [worker.js](worker.js) with Wrangler, then set that attribute to the deployed Worker URL.

The Worker sends each submission through Resend. Update the placeholder values in [wrangler.toml](wrangler.toml), add the API key as a secret, and deploy:

```bash
npm install -g wrangler
wrangler secret put RESEND_API_KEY
wrangler deploy
```

`EMAIL_FROM` must use a domain verified in Resend. Set `EMAIL_TO` to the inbox that should receive submissions and `ALLOWED_ORIGIN` to the site's origin. The Worker accepts only `POST` requests containing `name` and `description`.