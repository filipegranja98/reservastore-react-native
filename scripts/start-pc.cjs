// Local browser preview; the phone tunnel may keep running independently.
const path = require('node:path');
const { spawn } = require('node:child_process');
if (Number(process.versions.node.split('.')[0]) < 22) throw Error('Use Node 22.13 ou superior.');
const project = path.resolve(__dirname, '..');
const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const env = {...process.env, EXPO_NO_TELEMETRY:'1', RESERVASTORE_DEV_API_PROXY:'true', EXPO_PUBLIC_USE_DEV_API_PROXY:'true', EXPO_PUBLIC_API_URL:'http://localhost:8083/api/'};
delete env.EXPO_PACKAGER_PROXY_URL;
const child = spawn(process.execPath, [cli, 'start', '--localhost', '--port', '8083', '--max-workers', '2'], {cwd:project, env, stdio:'inherit'});
child.on('exit', code => {process.exitCode=code || 0;});
child.on('error', error => {console.error(error.message);process.exitCode=1;});
