import { createServer, IncomingMessage } from 'http';
import WebSocket, { WebSocketServer } from 'ws';

type RoomId = string; // 4-digit string

interface ClientMeta {
	ws: WebSocket;
	roomId: RoomId | null;
}

interface JoinMessage {
	type: 'join';
	roomId: RoomId;
}

interface CreateMessage {
	type: 'create';
}

interface ChatMessage {
	type: 'chat';
	text: string;
}

type InboundMessage = JoinMessage | CreateMessage | ChatMessage;

interface OutboundSystemMessage {
	type: 'system';
	text: string;
}

interface OutboundCreatedMessage {
	type: 'created';
	roomId: RoomId;
}

interface OutboundChatMessage {
	type: 'chat';
	from: 'you' | 'peer';
	text: string;
}

type OutboundMessage = OutboundSystemMessage | OutboundCreatedMessage | OutboundChatMessage;

const server = createServer();
const wss = new WebSocketServer({ server });

// roomId -> Set of clients
const rooms: Map<RoomId, Set<ClientMeta>> = new Map();

function generateRoomId(): RoomId {
	const id = Math.floor(1000 + Math.random() * 9000);
	return String(id);
}


function send(ws: WebSocket, msg: OutboundMessage): void {
	if (ws.readyState === WebSocket.OPEN) {
		ws.send(JSON.stringify(msg));
	}
}

function broadcastToRoom(roomId: RoomId, sender: WebSocket | null, msg: OutboundMessage): void {
	const clients = rooms.get(roomId);
	if (!clients) return;
	for (const client of clients) {
		if (sender && client.ws === sender) continue;
		send(client.ws, msg);
	}
}

function parseMessage(data: WebSocket.RawData): InboundMessage | null {
	try {
		const obj = JSON.parse(String(data));
		if (!obj || typeof obj !== 'object') return null;
		switch (obj.type) {
			case 'create':
				return { type: 'create' };
			case 'join':
				if (typeof obj.roomId === 'string') return { type: 'join', roomId: obj.roomId };
				return null;
			case 'chat':
				if (typeof obj.text === 'string') return { type: 'chat', text: obj.text };
				return null;
			default:
				return null;
		}
	} catch {
		return null;
	}
}

wss.on('connection', (ws: WebSocket, _req: IncomingMessage) => {
	const meta: ClientMeta = { ws, roomId: null };

	ws.on('message', (data) => {
		const msg = parseMessage(data);
		if (!msg) {
			send(ws, { type: 'system', text: 'Invalid message.' });
			return;
		}

		switch (msg.type) {
			case 'create': {
				const roomId = generateRoomId();
				meta.roomId = roomId;
				if (!rooms.has(roomId)) rooms.set(roomId, new Set());
				rooms.get(roomId)!.add(meta);
				send(ws, { type: 'created', roomId });
				break;
			}
			case 'join': {
				const { roomId } = msg;
				const clients = rooms.get(roomId);
				if (!clients) {
					send(ws, { type: 'system', text: 'Room not found.' });
					return;
				}
				meta.roomId = roomId;
				clients.add(meta);
				send(ws, { type: 'system', text: `Joined room ${roomId}.` });
				break;
			}
			case 'chat': {
				if (!meta.roomId) {
					send(ws, { type: 'system', text: 'Join or create a room first.' });
					return;
				}
				send(ws, { type: 'chat', from: 'you', text: msg.text });
				broadcastToRoom(meta.roomId, ws, { type: 'chat', from: 'peer', text: msg.text });
				break;
			}
		}
	});

	ws.on('close', () => {
		if (meta.roomId) {
			const clients = rooms.get(meta.roomId);
			if (clients) {
				clients.delete(meta);
				if (clients.size === 0) rooms.delete(meta.roomId);
			}
		}
	});

	ws.on('error', () => {
		// Keep minimal: errors are logged implicitly by runtime; no verbose output.
	});
});

const PORT = Number(process.env.PORT ?? 3000);
server.listen(PORT, () => {
	// eslint-disable-next-line no-console
	console.log(`WS server listening on port ${PORT}`);
});


