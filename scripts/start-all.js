#!/usr/bin/env node

import { spawn } from 'node:child_process';
import dotenv from 'dotenv';

dotenv.config();

const processes = [];
let shuttingDown = false;

function runScript(scriptName) {
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const child = spawn(npmCmd, ['run', scriptName], {
    stdio: 'inherit',
    env: process.env,
  });

  processes.push(child);

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    console.log(
      `[orchestrator] "${scriptName}" exited with ${signal ? `signal ${signal}` : `code ${code}`}`,
    );
    shutdown(code ?? (signal ? 1 : 0));
  });

  child.on('error', (error) => {
    console.error(`[orchestrator] Failed to start "${scriptName}":`, error);
    if (!shuttingDown) {
      shuttingDown = true;
      shutdown(1);
    }
  });
}

function shutdown(exitCode = 0) {
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) {
      child.kill();
    }
  }
  process.exit(exitCode);
}

process.on('SIGINT', () => {
  console.log('\n[orchestrator] Caught SIGINT, shutting down...');
  shutdown(0);
});

process.on('SIGTERM', () => {
  console.log('\n[orchestrator] Caught SIGTERM, shutting down...');
  shutdown(0);
});

console.log('[orchestrator] Starting websocket server and Vite dev server...');
runScript('server');
runScript('dev');

