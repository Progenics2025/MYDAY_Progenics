Password Reset Link Configuration

Why this matters
- Emails sent by the server include a reset link pointing to your frontend application. In development, that may default to localhost which won't work if users receive the email from an external network.

How the server builds the reset link
- Uses the following preference order to build the frontend URL:
  1. `FRONTEND_URL` environment variable (if set and non-empty)
  2. `Origin` header from the incoming request
  3. Constructed from the request protocol and host (best-effort)
  4. Fallback to `http://localhost:5173`

Recommended setup for production
1. Set `FRONTEND_URL` to your publicly reachable frontend site (example: `https://app.example.com`).
2. Configure SMTP environment variables (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`) so the mailer sends real emails.

Local testing options
- Preview mode (no SMTP): The mailer will create an Ethereal test account and return a preview URL. The server logs this preview URL when sending emails. Open it in your browser to see the message and follow the link.

- Use a tunneled public URL: If you want reset links that work from external networks, run your frontend dev server through a tunnel (ngrok, cloudflared) and set `FRONTEND_URL` to the tunnel URL. Example:

  ngrok http 5173
  export FRONTEND_URL="https://abcd1234.ngrok.app"
  npm run dev

- Use your own SMTP provider: configure MAIL_* env vars and the sent email will be delivered to the recipient's mailbox.

Troubleshooting
- If users receive a link pointing to `http://localhost:5173`, set `FRONTEND_URL` to a publicly reachable URL or use a tunnel when testing from external devices.
- If the server logs a preview URL, open that URL from your development machine to view the email and copy the reset link.

