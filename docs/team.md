# Team connection methods

Run one Agent Context server and connect teammates through Streamable HTTP.
Use the same project ID and a unique agent ID for each session. Everyone with
the instance token can access all its projects; per-user permissions are not
implemented. Share the token privately.

## Same Wi-Fi or LAN

Find the host computer's private IP. Replace 192.168.1.50 below with that IP.
Stop any existing service on port 8765, then run on the host:

```bash
agent-context-mcp --host 0.0.0.0 --port 8765 --db ./data/context.sqlite3 --allowed-host 192.168.1.50:8765 --allowed-origin http://192.168.1.50:8765
```

In a second host terminal, from the same directory:

```bash
agent-context-mcp token --db ./data/context.sqlite3
```

Teammates use `http://192.168.1.50:8765/mcp`, transport Streamable HTTP, and
header `Authorization: Bearer <instance-token>`. The dashboard is available at
`http://192.168.1.50:8765/dashboard`. The token comes from the host, not a
teammate's separate local installation. Use an absolute database path if needed.

Allow TCP 8765 only from your private subnet in the host firewall. Guest Wi-Fi
may isolate devices. Keep the host awake; a DHCP reservation can stabilize its
IP. Plain HTTP exposes token and data to network observers; use it only for a
deliberate test on a trusted private network. Prefer the encrypted methods
below for routine access. Do not forward port 8765 from an internet router.

## Private VPN

Connect the host and teammates to an authorized private VPN such as Tailscale.
For Tailscale Serve, use the host's real HTTPS hostname instead of this example:

```bash
agent-context-mcp --host 127.0.0.1 --db ./data/context.sqlite3 --allowed-host machine.tailnet-name.ts.net --allowed-origin https://machine.tailnet-name.ts.net
```

In a second host terminal:

```bash
tailscale serve --bg http://127.0.0.1:8765
tailscale serve status
```

Use the HTTPS hostname Serve reports, update the application's allowlists if
needed, and connect teammates to that address plus `/mcp`. Network policy must
allow their access. Keep bearer authentication enabled. Serve shares privately
inside your tailnet; public sharing is unnecessary.

Reference: https://tailscale.com/docs/reference/tailscale-cli/serve

## SSH tunnel

On the host, keep the application on loopback:

```bash
agent-context-mcp --host 127.0.0.1 --db ./data/context.sqlite3
```

On each teammate's computer with SSH installed and host access configured:

```bash
ssh -N -L 8765:127.0.0.1:8765 username@server-address
```

Keep the tunnel open and use `http://127.0.0.1:8765/mcp` with the host's token.
Here localhost works because SSH forwards the connection. The teammate's local
port 8765 must be free. There is no need to expose the MCP port publicly.

## Shared HTTPS server

Run the application on loopback on a persistent server with a TLS reverse
proxy. Set the exact domain in both allowlists:

```bash
agent-context-mcp --host 127.0.0.1 --db ./data/context.sqlite3 --allowed-host context.example.com --allowed-origin https://context.example.com
```

The reverse proxy forwards HTTPS requests to `127.0.0.1:8765`. Teammates use
`https://context.example.com/mcp` and the instance token. Configure DNS, TLS,
service restarts, and backups. See `examples/Caddyfile` and
https://caddyserver.com/docs/quick-starts/reverse-proxy.

## Troubleshooting

- Connection refused or timeout: check host, IP, port, firewall, and VPN/tunnel.
- 421: add the exact Host value, including any non-default port.
- 403: add the exact browser Origin, including scheme and non-default port.
- 401: use the token from the running host with the same database and credentials.
- Different history: verify the endpoint and project ID match.

Never use `0.0.0.0` as the client URL. Avoid a network-shared live SQLite file;
remote clients should use HTTP. The Vercel website is for docs and downloads,
not the live MCP server. These methods require setup and verification on your
network; their inclusion does not mean a VPN or shared host has been provisioned.
