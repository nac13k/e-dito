import { execSync } from 'node:child_process'

const run = (command) => {
  execSync(command, { stdio: 'inherit' })
}

const buildVersion = new Date().toISOString().slice(0, 10).replaceAll('-', '')
const semverVersion = `${buildVersion}.0.0`

let platform = ''
let builderArgs = ''

if (process.platform === 'darwin') {
  platform = 'mac'
  builderArgs = '--mac --publish never'
} else if (process.platform === 'linux') {
  platform = 'linux'
  builderArgs = '--linux --publish never'
} else {
  throw new Error('build:local soporta macOS y Linux')
}

const artifactName = `e-dito-${platform}-${buildVersion}.\${ext}`

run('npm run build')
run('npm run icons:generate')
run(
  `npx electron-builder ${builderArgs} --config.extraMetadata.version=${semverVersion} --config.buildVersion=${buildVersion} --config.artifactName='${artifactName}'`
)
