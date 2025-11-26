const { execSync } = require('child_process');
const path = require('path');

console.log('Installing Frontend dependencies...');

const frontendPath = path.join(__dirname, 'ExpertDashboard', 'Frontend');

try {
  execSync('npm install', {
    cwd: frontendPath,
    stdio: 'inherit',
    shell: true
  });
  console.log('✅ Frontend dependencies installed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to install frontend dependencies:', error.message);
  process.exit(1);
}
