import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
import semver from 'semver'
import enquirer from 'enquirer'
import { discoverPackages } from './discover-packages.js'

const execAsync = promisify(exec)
const require = createRequire(import.meta.url)
const { prompt } = enquirer

const rootPkg = require('../package.json')
const currentVersion = rootPkg.version || '0.1.0'

/**
 * Updates version in all package.json files
 * @param {string} targetVersion - New version to set
 */
function updateVersions(targetVersion) {
  const packages = discoverPackages()
  
  // Update root package.json
  const rootPkgPath = 'package.json'
  const rootPkg = require(`../${rootPkgPath}`)
  rootPkg.version = targetVersion
  require('fs').writeFileSync(rootPkgPath, JSON.stringify(rootPkg, null, 2) + '\n')
  
  // Update each package
  packages.forEach(packageName => {
    const pkgPath = `packages/${packageName}/package.json`
    const pkg = require(`../${pkgPath}`)
    pkg.version = targetVersion
    
    // Update workspace dependencies to use new version
    if (pkg.dependencies) {
      Object.keys(pkg.dependencies).forEach(dep => {
        if (dep.startsWith('@remobj/') && pkg.dependencies[dep] === 'workspace:*') {
          // Keep workspace:* for monorepo development
          // In real publishing, these would be resolved to actual versions
        }
      })
    }
    
    require('fs').writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
  })
  
  console.log(`✅ Updated version to ${targetVersion} in all packages`)
}

/**
 * Checks if CI is passing (placeholder - would check actual CI status)
 * @returns {Promise<boolean>} Whether CI is passing
 */
async function getCIResult() {
  try {
    // In a real setup, this would check GitHub Actions status
    // For now, just check if we can run tests
    await execAsync('npm test')
    return true
  } catch (error) {
    console.error('Tests are failing:', error.message)
    return false
  }
}

/**
 * Generates changelog entry (placeholder implementation)
 */
async function generateChangelog() {
  try {
    // In a real setup, this would use conventional-changelog or similar
    console.log('📝 Generating changelog...')
    // For now, just log that we would generate it
    console.log('✅ Changelog would be generated here')
  } catch (error) {
    console.error('Failed to generate changelog:', error.message)
  }
}

async function main() {
  try {
    console.log(`🚀 Starting release process from v${currentVersion}`)
    
    // 1. Check CI status
    console.log('🔍 Checking CI status...')
    const isCIPassed = await getCIResult()
    if (!isCIPassed) {
      console.error('❌ CI must pass before release')
      process.exit(1)
    }
    console.log('✅ CI is passing')

    // 2. Select release type
    const { release } = await prompt({
      type: 'select',
      name: 'release',
      message: 'Select release type',
      choices: [
        { name: `patch (${semver.inc(currentVersion, 'patch')})`, value: 'patch' },
        { name: `minor (${semver.inc(currentVersion, 'minor')})`, value: 'minor' },
        { name: `major (${semver.inc(currentVersion, 'major')})`, value: 'major' },
        { name: 'custom', value: 'custom' }
      ]
    })

    let targetVersion
    if (release === 'custom') {
      const { customVersion } = await prompt({
        type: 'input',
        name: 'customVersion',
        message: 'Enter custom version:',
        validate: (input) => semver.valid(input) ? true : 'Please enter a valid semver version'
      })
      targetVersion = customVersion
    } else {
      targetVersion = semver.inc(currentVersion, release)
    }

    console.log(`📦 Target version: ${targetVersion}`)

    // 3. Confirm release
    const { confirmed } = await prompt({
      type: 'confirm',
      name: 'confirmed',
      message: `Are you sure you want to release v${targetVersion}?`
    })

    if (!confirmed) {
      console.log('❌ Release cancelled')
      process.exit(0)
    }

    // 4. Build packages
    console.log('🔨 Building packages...')
    await execAsync('npm run build')
    console.log('✅ Build completed')

    // 5. Run tests one more time
    console.log('🧪 Running final tests...')
    await execAsync('npm test')
    console.log('✅ Tests passed')

    // 6. Update versions
    console.log('📝 Updating versions...')
    updateVersions(targetVersion)

    // 7. Generate changelog
    await generateChangelog()

    // 8. Git commit and tag
    console.log('📤 Creating git commit and tag...')
    await execAsync('git add -A')
    await execAsync(`git commit -m "release: v${targetVersion}"`)
    await execAsync(`git tag v${targetVersion}`)
    console.log('✅ Git commit and tag created')

    // 9. Build again with new version
    console.log('🔨 Building with new version...')
    await execAsync('npm run build')

    console.log(`🎉 Release v${targetVersion} is ready!`)
    console.log('📋 Next steps:')
    console.log(`   git push origin v${targetVersion}`)
    console.log('   git push')
    console.log('   npm publish (for each package)')

  } catch (error) {
    console.error('❌ Release failed:', error.message)
    process.exit(1)
  }
}

main()