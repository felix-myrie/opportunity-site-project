# Northstar

Static opportunity finder for high-schoolers. The page content is generated from [opportunities.csv](opportunities.csv).

## Edit the opportunities

Update the CSV and reload the site. Keep the header row and these columns:

```text
title,org,type,tag,time,mode
```

Fields containing commas should be wrapped in double quotes. The site loads the CSV in the browser, then uses it for the opportunity cards, filters, and generator counts.

## Run locally

Because browsers block `fetch()` for local files, serve the folder with any static server, for example:

```bash
python3 -m http.server 8000
```

Open `http://localhost:8000` after starting the server.