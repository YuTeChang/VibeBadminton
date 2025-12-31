#!/usr/bin/env node

/**
 * VibeBadminton Vercel Setup Script
 * Interactive setup script using Vercel CLI
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function exec(command, options = {}) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe', ...options });
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('🚀 VibeBadminton Vercel Setup');
  console.log('==============================\n');

  // Check if Vercel CLI is installed
  console.log('📦 Checking Vercel CLI...');
  const vercelCheck = exec('vercel --version');
  if (!vercelCheck) {
    console.log('❌ Vercel CLI is not installed\n');
    const install = await question('Install Vercel CLI globally? (y/n) ');
    if (install.toLowerCase() === 'y') {
      console.log('📥 Installing Vercel CLI...');
      exec('npm install -g vercel', { stdio: 'inherit' });
      console.log('✅ Vercel CLI installed\n');
    } else {
      console.log('⚠️  Please install Vercel CLI first: npm install -g vercel\n');
      process.exit(1);
    }
  } else {
    console.log(`✅ Vercel CLI installed: ${vercelCheck.trim()}\n`);
  }

  // Check if logged in
  console.log('🔐 Checking Vercel authentication...');
  const whoami = exec('vercel whoami');
  if (!whoami) {
    console.log('⚠️  Not logged in to Vercel\n');
    const login = await question('Log in to Vercel? (y/n) ');
    if (login.toLowerCase() === 'y') {
      console.log('🔑 Opening login...');
      exec('vercel login', { stdio: 'inherit' });
    } else {
      console.log('⚠️  Please log in first: vercel login\n');
      process.exit(1);
    }
  } else {
    console.log(`✅ Logged in as: ${whoami.trim()}\n`);
  }

  // Check if project is linked
  const vercelDir = path.join(process.cwd(), '.vercel');
  const projectJson = path.join(vercelDir, 'project.json');
  
  console.log('🔗 Checking project link...');
  if (!fs.existsSync(projectJson)) {
    console.log('⚠️  Project not linked to Vercel\n');
    const link = await question('Link project to Vercel? (y/n) ');
    if (link.toLowerCase() === 'y') {
      console.log('🔗 Linking project...');
      exec('vercel link', { stdio: 'inherit' });
    } else {
      console.log('⚠️  Please link project first: vercel link\n');
      process.exit(1);
    }
  } else {
    const projectData = JSON.parse(fs.readFileSync(projectJson, 'utf8'));
    console.log(`✅ Project linked: ${projectData.projectId}\n`);
  }

  // Check for Postgres database
  console.log('🗄️  Postgres Database Setup');
  console.log('─────────────────────────────\n');
  console.log('To create a Postgres database:');
  console.log('  1. Go to: https://vercel.com/dashboard');
  console.log('  2. Select your project');
  console.log('  3. Go to Storage → Create Database → Postgres');
  console.log('  4. Choose a name and region');
  console.log('  5. Click Create\n');
  
  const hasDb = await question('Have you created the Postgres database? (y/n) ');
  if (hasDb.toLowerCase() !== 'y') {
    console.log('\n⏸️  Please create the database first, then run this script again\n');
    process.exit(0);
  }

  // Pull environment variables
  console.log('\n📥 Pulling environment variables...');
  const envLocalPath = path.join(process.cwd(), '.env.local');
  
  try {
    exec('vercel env pull .env.local', { stdio: 'pipe' });
    
    if (fs.existsSync(envLocalPath)) {
      const envContent = fs.readFileSync(envLocalPath, 'utf8');
      if (envContent.includes('POSTGRES_URL')) {
        console.log('✅ Environment variables pulled to .env.local');
        console.log('✅ Postgres connection string found\n');
      } else {
        console.log('⚠️  .env.local created but Postgres variables not found');
        console.log('   Please add them manually from Vercel dashboard\n');
      }
    } else {
      console.log('⚠️  Could not create .env.local');
      console.log('   You may need to add environment variables manually\n');
    }
  } catch (error) {
    console.log('⚠️  Could not pull environment variables');
    console.log('   You may need to add them manually:\n');
    console.log('   1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables');
    console.log('   2. Copy the Postgres connection strings');
    console.log('   3. Add them to .env.local (see .env.example)\n');
  }

  // Initialize database
  console.log('🗄️  Database Initialization');
  console.log('───────────────────────────\n');
  const initDb = await question('Initialize database schema now? (y/n) ');
  
  if (initDb.toLowerCase() === 'y') {
    console.log('\n🔄 Starting dev server...');
    
    // Check if .env.local exists
    if (!fs.existsSync(envLocalPath)) {
      console.log('⚠️  .env.local not found. Please set up environment variables first.\n');
      process.exit(1);
    }

    // Start dev server in background
    const devProcess = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      shell: true,
    });

    let serverReady = false;
    devProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Ready') || output.includes('Local:')) {
        if (!serverReady) {
          serverReady = true;
          console.log('✅ Dev server started\n');
          console.log('📡 Initializing database...');
          
          // Wait a bit more for server to be fully ready
          setTimeout(() => {
            const http = require('http');
            const req = http.request(
              {
                hostname: 'localhost',
                port: 3000,
                path: '/api/init',
                method: 'POST',
              },
              (res) => {
                let data = '';
                res.on('data', (chunk) => {
                  data += chunk;
                });
                res.on('end', () => {
                  try {
                    const result = JSON.parse(data);
                    if (result.success) {
                      console.log('✅ Database initialized successfully!\n');
                    } else {
                      console.log('⚠️  Database initialization failed:');
                      console.log(`   ${result.error || 'Unknown error'}\n`);
                    }
                  } catch (error) {
                    console.log('⚠️  Could not parse response');
                    console.log(`   Response: ${data}\n`);
                  }
                  
                  console.log('🛑 Stopping dev server...');
                  devProcess.kill();
                  console.log('✅ Setup complete!\n');
                  
                  console.log('📚 Next steps:');
                  console.log('   1. Review .env.local to ensure all variables are set');
                  console.log('   2. Run: npm run dev');
                  console.log('   3. Test creating a session');
                  console.log('   4. Check Vercel Postgres dashboard to see the data\n');
                  
                  rl.close();
                  process.exit(0);
                });
              }
            );
            
            req.on('error', (error) => {
              console.log('⚠️  Could not initialize database:');
              console.log(`   ${error.message}\n`);
              console.log('   You can try manually:');
              console.log('   1. Run: npm run dev');
              console.log('   2. Visit: http://localhost:3000/api/init');
              console.log('   Or use: curl -X POST http://localhost:3000/api/init\n');
              
              devProcess.kill();
              rl.close();
              process.exit(1);
            });
            
            req.end();
          }, 3000);
        }
      }
    });

    devProcess.stderr.on('data', (data) => {
      // Ignore stderr for now
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        console.log('⚠️  Server did not start in time');
        console.log('   You can initialize manually:\n');
        console.log('   1. Run: npm run dev');
        console.log('   2. Visit: http://localhost:3000/api/init\n');
        devProcess.kill();
        rl.close();
        process.exit(1);
      }
    }, 30000);
  } else {
    console.log('\n⏭️  Skipping database initialization');
    console.log('   You can initialize it later by:');
    console.log('   1. Run: npm run dev');
    console.log('   2. Visit: http://localhost:3000/api/init');
    console.log('   Or use: curl -X POST http://localhost:3000/api/init\n');
    
    rl.close();
  }
}

main().catch((error) => {
  console.error('❌ Setup failed:', error);
  rl.close();
  process.exit(1);
});

