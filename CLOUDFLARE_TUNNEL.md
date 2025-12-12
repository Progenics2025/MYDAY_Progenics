Cloudflare Tunnel (cloudflared) setup for myDay

This project includes a sample Cloudflare Tunnel configuration at `.cloudflared/config.yml` using the provided tunnel id.

Quick start

1. Install cloudflared on the machine that runs the app. See https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation

2. Ensure the app is listening on localhost:5000 (or update `service: http://localhost:5000` in `.cloudflared/config.yml`).

3. If you used `cloudflared tunnel create` previously and have the credentials JSON file, place it and update `credentials-file:` in `.cloudflared/config.yml`.

4. Run the tunnel:

```bash
npm run tunnel:run
```

5. In Cloudflare dashboard, configure the tunnel `d2d7fc50-b5e5-40a5-addb-d1301a6449ed` to route a hostname (for example `myday.example.com`) and ensure DNS is set correctly.

Notes
- The included `config.yml` uses `myday.example.com` as a placeholder; replace with your actual domain or subdomain.
- For local development you can use Cloudflare's public hostname feature, or expose the hostname directly.
- If you're using a credentials file, uncomment and set `credentials-file` in `.cloudflared/config.yml`.

Security
- Keep credentials files out of source control. If you add a `credentials.json`, do not commit it.

Troubleshooting
- If `npm run tunnel:run` fails, try running `cloudflared tunnel --config .cloudflared/config.yml run` directly and inspect the logs.
- Ensure port 5000 is reachable locally and no other service blocks it.
