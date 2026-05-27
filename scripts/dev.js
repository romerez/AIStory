import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let shuttingDown = false;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

loadDotEnv(path.join(rootDir, '.env'));

const viteArgs = [
  'vite',
  '--host',
  process.env.VITE_HOST || '127.0.0.1',
  '--port',
  process.env.VITE_PORT || '5173',
  '--strictPort',
];
const webCommand = process.platform === 'win32'
  ? {
    command: 'cmd.exe',
    args: ['/d', '/s', '/c', `npx ${viteArgs.join(' ')}`],
  }
  : {
    command: 'npx',
    args: viteArgs,
  };

const commands = [
  {
    name: 'api',
    command: process.execPath,
    args: ['server/index.js'],
    env: {
      ...process.env,
      API_PORT: process.env.API_PORT || '8787',
      SERVE_STATIC: 'false',
    },
  },
  {
    name: 'web',
    command: webCommand.command,
    args: webCommand.args,
    env: process.env,
  },
];

const children = commands.map(({ name, command, args, env }) => {
  const child = spawn(command, args, {
    env,
    cwd: rootDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  pipeOutput(name, child.stdout, process.stdout);
  pipeOutput(name, child.stderr, process.stderr);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    console.log(`${name} exited with ${signal || code}`);
    shutdown(code || 0);
  });

  return child;
});

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

function shutdown(code) {
  shuttingDown = true;

  for (const child of children) {
    if (!child.killed) {
      child.kill();
    }
  }

  process.exit(code);
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');

    if (separatorIndex === -1) {
      continue;
    }

    const name = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');

    if (name && !process.env[name]) {
      process.env[name] = value;
    }
  }
}

function pipeOutput(name, stream, target) {
  let pending = '';

  stream.on('data', (chunk) => {
    const text = pending + chunk.toString();
    const lines = text.split(/\r?\n/);

    pending = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        target.write(`[${name}] ${line}\n`);
      }
    }
  });

  stream.on('end', () => {
    if (pending.trim()) {
      target.write(`[${name}] ${pending}\n`);
    }
  });
}
