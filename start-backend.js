const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const venvPath = path.join(__dirname, 'backend-specto', 'venv');
const pythonPath = isWindows 
  ? path.join(venvPath, 'Scripts', 'python.exe')
  : path.join(venvPath, 'bin', 'python');

const backendPath = path.join(__dirname, 'backend-specto');

const proc = spawn(pythonPath, ['-m', 'uvicorn', 'main:app', '--reload'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: true
});

proc.on('error', (err) => {
  console.error('Erro ao iniciar backend:', err);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code);
});