## Terminal chat over local network (ws)

Minimal Node.js + TypeScript WebSocket chat using a 4-digit room ID. Runs entirely in the terminal on the same LAN.

### Install

```bash
npm install
npm run build
```

### Run server

```bash
npm run start:server
# Optionally choose port
# PORT=4000 npm run start:server
```

### Run client

On each terminal (yours and your friend's), run:

```bash
# Replace HOST with the server machine's LAN IP (e.g. 192.168.1.23)
HOST=localhost PORT=3000 npm run start:client
```

Then:

- Choose `c` to create a room. You'll get a 4-digit room ID to share.
- Your friend chooses `j` and enters the same 4-digit ID.
- Type messages and press Enter to chat.

Notes:
- Ensure both machines are on the same local network and the server port is reachable.
- Keep one server running; multiple clients can join the same room.


