import { defineConfig } from 'vite';
import fs from 'fs';
import path from 'path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3005,
    open: true
  },
  plugins: [
    {
      name: 'local-db-api',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url || '';
          if (url.startsWith('/api/local-db')) {
            res.setHeader('Content-Type', 'application/json');

            // Parse body
            let bodyStr = '';
            await new Promise((resolve) => {
              req.on('data', chunk => { bodyStr += chunk; });
              req.on('end', resolve);
            });

            let body: any = {};
            if (bodyStr) {
              try {
                body = JSON.parse(bodyStr);
              } catch (e) {}
            }

            try {
              if (url.includes('/check')) {
                const dirPath = body.dirPath || new URL(url, 'http://localhost').searchParams.get('path') || '';
                if (!dirPath) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing dirPath' }));
                  return;
                }
                const resolvedPath = path.resolve(dirPath);
                if (!fs.existsSync(resolvedPath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'Directory does not exist' }));
                  return;
                }
                // List JSON files
                const files = fs.readdirSync(resolvedPath).filter(f => f.endsWith('.json'));
                res.end(JSON.stringify({ success: true, folderName: path.basename(resolvedPath), files }));
                return;
              }

              if (url.includes('/write')) {
                const { dirPath, file, data } = body;
                if (!dirPath || !file || !data) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing dirPath, file, or data' }));
                  return;
                }
                const resolvedDir = path.resolve(dirPath);
                if (!fs.existsSync(resolvedDir)) {
                  fs.mkdirSync(resolvedDir, { recursive: true });
                }
                const filePath = path.join(resolvedDir, file);
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                res.end(JSON.stringify({ success: true }));
                return;
              }

              if (url.includes('/read')) {
                const { dirPath, file } = body;
                if (!dirPath || !file) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing dirPath or file' }));
                  return;
                }
                const resolvedDir = path.resolve(dirPath);
                const filePath = path.join(resolvedDir, file);
                if (!fs.existsSync(filePath)) {
                  res.statusCode = 404;
                  res.end(JSON.stringify({ error: 'File not found' }));
                  return;
                }
                const dataStr = fs.readFileSync(filePath, 'utf-8');
                res.end(JSON.stringify({ success: true, data: JSON.parse(dataStr) }));
                return;
              }

              res.statusCode = 404;
              res.end(JSON.stringify({ error: 'Not found' }));
            } catch (err: any) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: err.message }));
            }
          } else {
            next();
          }
        });
      }
    }
  ]
});
