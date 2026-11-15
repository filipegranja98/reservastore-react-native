const { spawnSync } = require('node:child_process');
const path = require('node:path');
const configured = process.env.EXPO_PUBLIC_API_URL;
if (!configured) throw new Error('Defina EXPO_PUBLIC_API_URL com o endereço HTTPS público da API.');
const api = new URL(configured);
if (api.protocol !== 'https:' || api.username || api.password || api.search || api.hash || !api.pathname.endsWith('/api/')) {
  throw new Error('EXPO_PUBLIC_API_URL deve ser HTTPS e terminar em /api/, sem credenciais ou parâmetros.');
}
const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const env = { ...process.env, NODE_ENV: 'production', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1' };
delete env.EXPO_PUBLIC_USE_DEV_API_PROXY;
delete env.EXPO_PUBLIC_DEMO_MEDIA_PROXY;
const result = spawnSync(process.execPath, [cli, 'export', '--platform', 'web', '--output-dir', 'dist'], { env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
