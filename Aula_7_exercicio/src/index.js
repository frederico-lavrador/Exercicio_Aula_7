import { createServer } from 'node:http';
import { parse } from 'url';
import { v4 as uuidv4 } from 'uuid';
import { writeFile, readFile, readdir, unlink, mkdir } from 'node:fs/promises';

const ensureDataDirectoryExists = async () => {
	try {
		await mkdir('Data');
	} catch (error) {
		if (error.code !== 'EEXIST') {
			throw error;
		}
	}
};

const parseJson = async (req) => {
	return new Promise((resolve, reject) => {

		let data = '';

		req.on('data', (chunk) => {

			data += chunk;

		});

		req.on('end', () => {

			try {
				
				resolve(JSON.parse(data));

			} catch (error) {

				reject(error);

			}
		});
	});
};

/* const server = createServer((req, res) => {
	const { method, url } = req;
	const { pathname, query } = parse(url, true);

	if (pathname === '/users') {
		if (method === 'POST') {
			parseJson(req)
				.then(user => {
					user.id = uuidv4();
					users.push(user);
					res.writeHead(201, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify(user));
				})
				.catch(error => {
					res.writeHead(400, { 'Content-Type': 'application/json' });
					res.end(JSON.stringify({ error: 'Invalid JSON' }));
				});
		} else if (method === 'GET') {
			res.writeHead(200, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify(users));
		} else {
			res.writeHead(405, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Method Not Allowed' }));
		}
	} else if (pathname.startsWith('/users/')) {
		const userId = pathname.slice(7);
		const user = users.find(u => u.id === userId);

		if (!user) {
			res.writeHead(404, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'User not found' }));

			return;
		}

		if (method === 'GET') {
			res.writeHead(200, { 'Content-Type': 'applicaton/json' });
			res.end(JSON.stringify(user));
		} else if (method === 'PUT') {
			parseJson(req).then(updateUser => {
				Object.assign(user, updateUser);

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(user));
			});
		} else if (method === 'DELETE') {
			users = users.filter(u => u.id !== userId);

			res.writeHead(204, { 'Content-Type': 'application/json' });
			res.end();
		} else {
			res.writeHead(405, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Method Not Allowed' }));
		}
	} else {
		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Route Not Found' }));
	}
}); */

const server = createServer(async (req, res) => {

	const { method, url } = req;
	const { pathname } = parse(url, true);

	if (pathname === '/users') {
		
		if (method === 'POST') {

			try {

				const user = await parseJson(req);

				user.id = uuidv4();
				await writeFile(`data/${user.id}.json`, JSON.stringify(user));
				res.writeHead(201, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(user));

			} catch (error) {
				
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Invalid JSON' }));

			}

		} else if (method === 'GET') {
			
			try {
				
				const files = await readdir('data');
				const users = await Promise.all(

					files.map(async (file) => {

						const data = await readFile(`data/${file}`, 'utf-8');

						return JSON.parse(data);

					})

				);

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(users));

			} catch (error) {
				
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Internal Server Error' }));

			}

		} else {

			res.writeHead(405, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Method Not Allowed' }));

		}

	} else if (pathname.startsWith('/users/')) {
		
		const userId = pathname.slice(7);

		if (method === 'PUT') {
			
			try {

				const updateUser = await parseJson(req);
				const filePath = `data/${userId}.json`;
				const existingUser = JSON.parse(await readFile(filePath, 'utf-8'));
				const updatedUser = { ...existingUser, ...updateUser };

				await writeFile(filePath, JSON.stringify(updatedUser));

				res.writeHead(200, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify(updatedUser));

			} catch (error) {
				
				res.writeHead(400, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Invalid JSON' }));

			}

		} else if (method === 'DELETE') {
			
			try {
				
				await unlink(`data/${userId}.json`);

				res.writeHead(204);
				res.end();

			} catch (error) {
				
				res.writeHead(500, { 'Content-Type': 'application/json' });
				res.end(JSON.stringify({ error: 'Internal Server Error' }));

			}

		} else {

			res.writeHead(405, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ error: 'Method Not Allowed' }));

		}

	} else {

		res.writeHead(404, { 'Content-Type': 'application/json' });
		res.end(JSON.stringify({ error: 'Route not found' }));

	}

});

const PORT = 3000;

server.listen(PORT, async () => {
	
	await ensureDataDirectoryExists();
	console.log(`Server is running on http://localhost:${PORT}`);

});
