const { spawn } = require('child_process');
const path = require('path');

console.log('Starting Expert Dashboard application...');

const expertDashboardPath = path.join(__dirname, 'ExpertDashboard');

const installAndRun = spawn('npm', ['run', 'dev:backend'], {
  cwd: expertDashboardPath,
  stdio: 'inherit',
  shell: true
});

installAndRun.on('error', (error) => {
  console.error(`Error starting application: ${error.message}`);
  process.exit(1);
});

installAndRun.on('exit', (code) => {
  console.log(`Application exited with code ${code}`);
  process.exit(code);
});

process.on('SIGTERM', () => {
  console.log('Received SIGTERM signal, shutting down...');
  installAndRun.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('Received SIGINT signal, shutting down...');
  installAndRun.kill('SIGINT');
});
