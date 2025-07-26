#!/usr/bin/env node

/**
 * Name Availability Checker
 * 
 * Checks if a name is available on:
 * - GitHub (username/organization)
 * - npm (package name)
 * - npm organization (@name/*)
 * 
 * Usage: node check-name-availability.js <name>
 * 
 * GitHub API Rate Limiting:
 * - Without token: 60 requests/hour
 * - With token: 5000 requests/hour
 * - To avoid rate limits: export GITHUB_TOKEN=your_personal_access_token
 */

const https = require('https');
const { promisify } = require('util');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[36m',
  gray: '\x1b[90m'
};

/**
 * Make HTTPS request
 */
function httpsRequest(options) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: data
        });
      });
    });
    
    req.on('error', reject);
    req.end();
  });
}

/**
 * Check GitHub username/organization availability
 */
async function checkGitHub(name) {
  try {
    // Add delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // First check if the username/org exists
    const userResponse = await httpsRequest({
      hostname: 'api.github.com',
      path: `/users/${name}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Name-Availability-Checker/1.0',
        'Accept': 'application/vnd.github.v3+json',
        // Add GitHub token if available in environment
        ...(process.env.GITHUB_TOKEN ? { 'Authorization': `token ${process.env.GITHUB_TOKEN}` } : {})
      }
    });
    
    if (userResponse.statusCode === 404) {
      // Username is available
      return { available: true, url: `https://github.com/${name}` };
    } else if (userResponse.statusCode === 200) {
      // Username exists, now check if they have a repo with the same name
      const repoResponse = await httpsRequest({
        hostname: 'api.github.com',
        path: `/repos/${name}/${name}`,
        method: 'GET',
        headers: {
          'User-Agent': 'Name-Availability-Checker/1.0'
        }
      });
      
      const userData = JSON.parse(userResponse.data);
      return { 
        available: false, 
        url: `https://github.com/${name}`,
        type: userData.type || 'User',
        hasRepo: repoResponse.statusCode === 200
      };
    } else if (userResponse.statusCode === 403) {
      return { 
        available: 'rate_limited', 
        error: 'GitHub API rate limit exceeded. Try again later or set GITHUB_TOKEN env variable.',
        note: 'Rate limited - check manually at https://github.com/' + name
      };
    } else {
      return { available: 'unknown', error: `Status: ${userResponse.statusCode}` };
    }
  } catch (error) {
    return { available: 'error', error: error.message };
  }
}


/**
 * Check npm package availability
 */
async function checkNpmPackage(name) {
  try {
    const response = await httpsRequest({
      hostname: 'registry.npmjs.org',
      path: `/${encodeURIComponent(name)}`,
      method: 'GET'
    });
    
    if (response.statusCode === 404) {
      return { available: true, url: `https://www.npmjs.com/package/${name}` };
    } else if (response.statusCode === 200) {
      const data = JSON.parse(response.data);
      return { 
        available: false, 
        url: `https://www.npmjs.com/package/${name}`,
        version: data['dist-tags']?.latest || 'unknown'
      };
    } else {
      return { available: 'unknown', error: `Status: ${response.statusCode}` };
    }
  } catch (error) {
    return { available: 'error', error: error.message };
  }
}

/**
 * Check npm organization availability
 */
async function checkNpmOrg(name) {
  // Check if the org exists by trying to access a non-existent package under it
  try {
    const response = await httpsRequest({
      hostname: 'registry.npmjs.org',
      path: `/@${encodeURIComponent(name)}%2F__check_org__`,
      method: 'GET'
    });
    
    if (response.statusCode === 404) {
      // Could mean org doesn't exist or package doesn't exist
      // Try to check a known org pattern
      const orgCheckResponse = await httpsRequest({
        hostname: 'www.npmjs.com',
        path: `/org/${encodeURIComponent(name)}`,
        method: 'HEAD',
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });
      
      if (orgCheckResponse.statusCode === 404) {
        return { available: true, url: `https://www.npmjs.com/org/${name}` };
      } else if (orgCheckResponse.statusCode === 200 || orgCheckResponse.statusCode === 302) {
        return { available: false, url: `https://www.npmjs.com/org/${name}` };
      }
    }
    
    return { available: 'unknown', note: 'npm org check is limited' };
  } catch (error) {
    return { available: 'error', error: error.message };
  }
}

/**
 * Format result for display
 */
function formatResult(service, result) {
  const icon = result.available === true ? '✅' : 
               result.available === false ? '❌' : 
               result.available === 'unknown' ? '❓' : 
               result.available === 'rate_limited' ? '⏳' : '⚠️';
  
  const status = result.available === true ? `${colors.green}Available${colors.reset}` :
                 result.available === false ? `${colors.red}Taken${colors.reset}` :
                 result.available === 'unknown' ? `${colors.yellow}Unknown${colors.reset}` :
                 result.available === 'rate_limited' ? `${colors.yellow}Rate Limited${colors.reset}` :
                 `${colors.red}Error${colors.reset}`;
  
  let output = `${icon} ${service}: ${status}`;
  
  if (result.type) {
    output += ` ${colors.yellow}[${result.type}]${colors.reset}`;
  }
  
  if (result.hasRepo !== undefined) {
    output += result.hasRepo ? ` ${colors.gray}(has repo ${result.url}/${service.split('/').pop()})${colors.reset}` : '';
  }
  
  if (result.url && !result.hasRepo) {
    output += ` ${colors.gray}(${result.url})${colors.reset}`;
  }
  
  if (result.version) {
    output += ` ${colors.blue}v${result.version}${colors.reset}`;
  }
  
  if (result.error) {
    output += ` ${colors.red}${result.error}${colors.reset}`;
  }
  
  if (result.note) {
    output += ` ${colors.yellow}${result.note}${colors.reset}`;
  }
  
  return output;
}

/**
 * Check related names
 */
async function checkRelatedNames(baseName) {
  const variations = [
    baseName,
    `${baseName}js`,
    `${baseName}-js`,
    `${baseName}io`,
    `${baseName}-io`,
    `${baseName}lib`,
    `${baseName}-lib`,
    `${baseName}x`,
    `x${baseName}`,
    `node-${baseName}`,
    `js-${baseName}`
  ];
  
  console.log(`\n${colors.blue}Checking variations:${colors.reset}`);
  
  for (const name of variations) {
    if (name === baseName) continue;
    
    console.log(`\n${colors.yellow}Checking "${name}":${colors.reset}`);
    
    const npmResult = await checkNpmPackage(name);
    if (npmResult.available === true) {
      console.log(`  ${formatResult('npm package', npmResult)}`);
    }
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node check-name-availability.js <name> [--variations]');
    console.log('\nExample:');
    console.log('  node check-name-availability.js myproject');
    console.log('  node check-name-availability.js myproject --variations');
    process.exit(1);
  }
  
  const name = args[0];
  const checkVariations = args.includes('--variations');
  
  console.log(`\n${colors.blue}Checking availability for "${name}"...${colors.reset}\n`);
  
  // Run all checks in parallel
  const [github, npmPkg, npmOrg] = await Promise.all([
    checkGitHub(name),
    checkNpmPackage(name),
    checkNpmOrg(name)
  ]);
  
  // Display results
  console.log(formatResult('GitHub username/org', github));
  console.log(formatResult('npm package', npmPkg));
  console.log(formatResult('npm @org', npmOrg));
  
  // Summary
  const allAvailable = [github, npmPkg].every(r => r.available === true);
  const someAvailable = [github, npmPkg].some(r => r.available === true);
  
  if (allAvailable) {
    console.log(`\n${colors.green}🎉 "${name}" is available everywhere!${colors.reset}`);
  } else if (someAvailable) {
    console.log(`\n${colors.yellow}⚠️  "${name}" is partially available${colors.reset}`);
  } else {
    console.log(`\n${colors.red}❌ "${name}" is not available${colors.reset}`);
  }
  
  // Check variations if requested
  if (checkVariations) {
    await checkRelatedNames(name);
  }
  
  // Suggestions for alternative names
  if (!allAvailable) {
    console.log(`\n${colors.blue}Alternative name suggestions:${colors.reset}`);
    const suggestions = generateSuggestions(name);
    
    for (const suggestion of suggestions.slice(0, 5)) {
      const npmCheck = await checkNpmPackage(suggestion);
      if (npmCheck.available === true) {
        console.log(`  ${colors.green}→${colors.reset} ${suggestion}`);
      }
    }
  }
}

/**
 * Generate name suggestions
 */
function generateSuggestions(baseName) {
  const suggestions = [];
  
  // Common prefixes
  const prefixes = ['x', 'neo', 'next', 'new', 'super', 'ultra', 'pro', 'lite', 'mini', 'micro', 'nano'];
  for (const prefix of prefixes) {
    suggestions.push(`${prefix}${baseName}`);
    suggestions.push(`${prefix}-${baseName}`);
  }
  
  // Common suffixes
  const suffixes = ['x', 'js', 'io', 'lib', 'kit', 'tool', 'plus', 'pro', 'next', 'core'];
  for (const suffix of suffixes) {
    suggestions.push(`${baseName}${suffix}`);
    suggestions.push(`${baseName}-${suffix}`);
  }
  
  // Letter substitutions
  if (baseName.includes('x')) {
    suggestions.push(baseName.replace('x', 'ks'));
    suggestions.push(baseName.replace('x', 'cs'));
  }
  
  // Double letters
  suggestions.push(`${baseName}${baseName.slice(-1)}`);
  
  // Abbreviations
  if (baseName.length > 4) {
    suggestions.push(baseName.slice(0, 3));
    suggestions.push(baseName.slice(0, 4));
  }
  
  // Remove duplicates
  return [...new Set(suggestions)];
}

// Run the script
main().catch(error => {
  console.error(`\n${colors.red}Error: ${error.message}${colors.reset}`);
  process.exit(1);
});