import readline from 'readline';
import WebSocket from 'ws';

type Mode = 'create' | 'join';

interface CreatedMsg { type: 'created'; roomId: string }
interface SystemMsg { type: 'system'; text: string }
interface ChatMsg { type: 'chat'; from: 'you' | 'peer'; text: string }
type ServerMsg = CreatedMsg | SystemMsg | ChatMsg;

function prompt(question: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer.trim());
		});
	});
}

async function main(): Promise<void> {
    const modeAnswer = (await prompt('Choose mode: [c]reate or [j]oin? ')).toLowerCase();
    const mode: Mode = modeAnswer.startsWith('j') ? 'join' : 'create';

    let host = process.env.HOST ?? 'localhost';
    let port = Number(process.env.PORT ?? 3000);
    if (mode === 'join') {
        const inputHost = await prompt('Enter server IP/host (e.g., 192.168.1.10): ');
        if (inputHost.length > 0) host = inputHost;
        const inputPort = await prompt('Enter server port (default 3000): ');
        const parsed = Number(inputPort.trim());
        if (!Number.isNaN(parsed) && parsed > 0) port = parsed;
    }
    const url = `ws://${host}:${port}`;

    const ws = new WebSocket(url);

	ws.on('open', async () => {
		if (mode === 'create') {
			ws.send(JSON.stringify({ type: 'create' }));
		} else {
			let roomId = await prompt('Enter 4-digit room ID: ');
			roomId = roomId.replace(/\D/g, '').slice(0, 4);
			if (roomId.length !== 4) {
				console.log('Invalid room ID.');
				process.exit(1);
			}
			ws.send(JSON.stringify({ type: 'join', roomId }));
		}

		const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
		rl.setPrompt('> ');
		rl.prompt();
		rl.on('line', (line) => {
			const text = line.trim();
			if (text.length === 0) {
				rl.prompt();
				return;
			}
			ws.send(JSON.stringify({ type: 'chat', text }));
			rl.prompt();
		});
	});

	ws.on('message', (data) => {
		try {
			const msg = JSON.parse(String(data)) as ServerMsg;
			switch (msg.type) {
				case 'created':
					console.log(`Room created. Share this 4-digit ID with your friend: ${msg.roomId}`);
					break;
				case 'system':
					console.log(`[system] ${msg.text}`);
					break;
				case 'chat':
					console.log(msg.from === 'you' ? `(you): ${msg.text}` : `(peer): ${msg.text}`);
					break;
				default:
					break;
			}
		} catch {
			// ignore malformed
		}
	});

	ws.on('close', () => {
		console.log('Disconnected.');
		process.exit(0);
	});

	ws.on('error', () => {
		console.error('WebSocket error.');
	});
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});


