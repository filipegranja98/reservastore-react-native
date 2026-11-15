// Start from a Node 22+ terminal. Optional first argument: lan (default: ngrok).
const path = require('node:path');
const { spawn } = require('node:child_process');
const project = path.resolve(__dirname, '..');
const mode = process.argv[2] || 'ngrok';
if (!['ngrok', 'lan'].includes(mode)) throw new Error('Modo permitido: ngrok ou lan.');
if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Use Node 22.13 ou superior compatível.');
const cli = path.join(path.dirname(require.resolve('expo/package.json')), 'bin', 'cli');
const env = {...process.env,
  __UNSAFE_EXPO_HOME_DIRECTORY:path.join(project,'.expo','user-cache'),
  EXPO_NO_TELEMETRY:'1', EXPO_NO_INSPECTOR_PROXY:'1',
  RESERVASTORE_DEV_API_PROXY:'true', EXPO_PUBLIC_USE_DEV_API_PROXY:'true',
};
delete env.EXPO_OFFLINE;
delete env.EXPO_PACKAGER_PROXY_URL;
if (mode === 'lan' && !env.REACT_NATIVE_PACKAGER_HOSTNAME) console.log('Defina REACT_NATIVE_PACKAGER_HOSTNAME com o IPv4 LAN se houver VPNs/adaptadores virtuais.');
const args = [cli,'start',...(mode === 'ngrok' ? ['--tunnel','ngrok'] : ['--lan']),'--go','--port','8000','--max-workers','2'];
const child=spawn(process.execPath,args,{cwd:project,env,stdio:'inherit'});
child.on('exit', code => {process.exitCode=code || 0;});
child.on('error', error => {console.error(error.message);process.exitCode=1;});
