const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const frontendDir = path.join(rootDir, 'ui');
const backendDir = path.join(rootDir, 'server');

console.log('⚡ Starting build and packaging pipeline...');

try {
    // 0. Auto-increment app version
    console.log('🔄 Bumping version using increment_version.py...');
    try {
        execSync('python increment_version.py patch', { cwd: __dirname, stdio: 'inherit' });
    } catch (pyError) {
        try {
            execSync('py increment_version.py patch', { cwd: __dirname, stdio: 'inherit' });
        } catch (pyError2) {
            console.warn('⚠️ Python not found or failed to run increment_version.py, skipping version bump.');
        }
    }

    // 1. Build Spring Boot Java backend
    console.log('☕ Compiling backend Java service...');
    let mvnCmd = 'mvn';
    // Check if IntelliJ Maven is available on Windows if standard maven is not found
    try {
        execSync('where mvn', { stdio: 'ignore' });
    } catch (e) {
        const ideaMvn = 'C:\\Program Files\\JetBrains\\IntelliJ IDEA 2026.1.2\\plugins\\maven\\lib\\maven3\\bin\\mvn';
        if (fs.existsSync(ideaMvn) || fs.existsSync(ideaMvn + '.cmd')) {
            mvnCmd = ideaMvn;
        }
    }
    execSync(`"${mvnCmd}" clean package -DskipTests`, { cwd: backendDir, stdio: 'inherit' });

    // 2. Install frontend dependencies
    console.log('📦 Installing frontend npm dependencies...');
    execSync('npm install', { cwd: frontendDir, stdio: 'inherit' });

    // 3. Build frontend React assets
    console.log('📦 Building frontend React UI assets...');
    execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

    // 3.5 Copy help documentation
    console.log('📋 Copying help guides to React build output...');
    const docsHelpDir = path.join(rootDir, 'wiki', 'help');
    const buildHelpDir = path.join(frontendDir, 'build', 'help');
    if (fs.existsSync(docsHelpDir)) {
        if (!fs.existsSync(buildHelpDir)) {
            fs.mkdirSync(buildHelpDir, { recursive: true });
        }
        const files = fs.readdirSync(docsHelpDir);
        for (const file of files) {
            fs.copyFileSync(path.join(docsHelpDir, file), path.join(buildHelpDir, file));
        }
        console.log(`Successfully copied help docs to ${buildHelpDir}`);
    }

    // 4. Package Electron desktop app
    console.log('🚀 Packaging Electron application with electron-builder...');
    execSync('npx electron-builder', { cwd: frontendDir, stdio: 'inherit' });

    // 5. Sign the deliverables if sign-app exists
    const signAppScript = path.join(__dirname, 'sign-app.bat');
    const distDir = path.join(rootDir, 'dist');
    if (fs.existsSync(signAppScript) && fs.existsSync(distDir)) {
        console.log('✍️ Code signing packaged installers in dist...');
        const files = fs.readdirSync(distDir);
        for (const file of files) {
            if (file.endsWith('.exe')) {
                const exePath = path.join(distDir, file);
                try {
                    execSync(`"${signAppScript}" "${exePath}"`, { stdio: 'inherit' });
                } catch (signErr) {
                    console.error(`⚠️ Failed to sign installer: ${exePath}`, signErr.message);
                }
            }
        }
    }

    console.log('✅ Build and packaging completed successfully!');
} catch (error) {
    console.error('❌ Build failed:', error.message);
    process.exit(1);
}
