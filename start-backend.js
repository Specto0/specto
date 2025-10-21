const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const isWindows = os.platform() === 'win32';
const repoRoot = __dirname;
const backendPath = path.join(repoRoot, 'backend-specto');

const candidateVenvs = [
  path.join(repoRoot, 'backend-specto', 'venv'),
  path.join(repoRoot, 'venv')
];

const pythonFromVenv = candidateVenvs
  .map((venvPath) => isWindows
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python'))
  .find((pythonPath) => fs.existsSync(pythonPath));

const pythonCommand = pythonFromVenv || (isWindows ? 'python' : 'python3');

if (!pythonFromVenv) {
  console.warn('Virtualenv Python não encontrado, tentando usar Python global.');
}

const proc = spawn(pythonCommand, ['-m', 'uvicorn', 'main:app', '--reload'], {
  cwd: backendPath,
  stdio: 'inherit',
  shell: false
});

proc.on('error', (err) => {
  console.error('Erro ao iniciar backend:', err);
  process.exit(1);
});

proc.on('exit', (code) => {
  process.exit(code);
});
