const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dirsToClean = [
    path.join(rootDir, 'backend', 'target'),
    path.join(rootDir, 'frontend', 'build'),
    path.join(rootDir, 'frontend', 'dist')
];

const filesToClean = [
    path.join(rootDir, 'fboss.db'),
    path.join(rootDir, 'e-abhilekh.db'),
    path.join(rootDir, 'backend', 'fboss.db'),
    path.join(rootDir, 'backend', 'e-abhilekh.db')
];

console.log('🧼 Cleaning workspace build directories and logs...');

function deleteFolderRecursive(directoryPath) {
    if (fs.existsSync(directoryPath)) {
        fs.readdirSync(directoryPath).forEach((file) => {
            const curPath = path.join(directoryPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                deleteFolderRecursive(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(directoryPath);
    }
}

let cleanedAny = false;

// 1. Clean directories
for (const dir of dirsToClean) {
    try {
        if (fs.existsSync(dir)) {
            console.log(`Deleting directory: ${dir}`);
            deleteFolderRecursive(dir);
            cleanedAny = true;
        }
    } catch (error) {
        console.error(`❌ Failed to clean directory ${dir}:`, error.message);
    }
}

// 2. Clean explicit files
for (const file of filesToClean) {
    try {
        if (fs.existsSync(file)) {
            console.log(`Deleting file: ${file}`);
            fs.unlinkSync(file);
            cleanedAny = true;
        }
    } catch (error) {
        console.error(`❌ Failed to delete file ${file}:`, error.message);
    }
}

// 3. Clean JVM crash logs in root and backend
const locationsToScanLogs = [rootDir, path.join(rootDir, 'backend')];
for (const loc of locationsToScanLogs) {
    try {
        if (fs.existsSync(loc)) {
            const files = fs.readdirSync(loc);
            files.forEach((file) => {
                if (file.startsWith('hs_err_pid') && file.endsWith('.log')) {
                    const filePath = path.join(loc, file);
                    console.log(`Deleting crash log: ${filePath}`);
                    fs.unlinkSync(filePath);
                    cleanedAny = true;
                }
                if (file.startsWith('replay_pid') && file.endsWith('.log')) {
                    const filePath = path.join(loc, file);
                    console.log(`Deleting replay log: ${filePath}`);
                    fs.unlinkSync(filePath);
                    cleanedAny = true;
                }
            });
        }
    } catch (error) {
        console.error(`❌ Failed to clean log files in ${loc}:`, error.message);
    }
}

if (cleanedAny) {
    console.log('✅ Cleaned all compile target folders, log files, and leftover databases.');
} else {
    console.log('✨ Workspace is already clean.');
}
