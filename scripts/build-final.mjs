import { execSync } from 'node:child_process'

const run = (command) => {
  execSync(command, { stdio: 'inherit' })
}

run('npm run build')
run('npm run icons:generate')

if (process.platform === 'darwin') {
  run('npx electron-builder --mac --publish never')
} else if (process.platform === 'linux') {
  run('npx electron-builder --linux --publish never')
} else {
  throw new Error('build:final soporta macOS y Linux en este proyecto')
}
