import { copyFile, mkdir } from 'node:fs/promises'
import path from 'node:path'

import icongen from 'icon-gen'

const projectRoot = process.cwd()
const sourceSvg = path.join(projectRoot, 'public/icons/e-dito-icon-v2-violet.svg')
const outputDir = path.join(projectRoot, 'build/icons')

await mkdir(outputDir, { recursive: true })

await icongen(sourceSvg, outputDir, {
  report: true,
  ico: {
    name: 'edito',
    sizes: [16, 24, 32, 48, 64, 128, 256],
  },
  icns: {
    name: 'edito',
    sizes: [16, 32, 64, 128, 256, 512, 1024],
  },
  favicon: {
    name: 'edito-',
    pngSizes: [32, 64, 128, 256, 512],
    icoSizes: [16, 24, 32, 48, 64],
  },
})

await copyFile(path.join(outputDir, 'edito.ico'), path.join(outputDir, 'icon.ico'))
await copyFile(path.join(outputDir, 'edito.icns'), path.join(outputDir, 'icon.icns'))
await copyFile(path.join(outputDir, 'edito-512.png'), path.join(outputDir, 'icon.png'))

console.log('Icon assets generated in build/icons')
