const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const dirsToClean = [
    path.join(rootDir, 'backend', 'target'),
    path.join(rootDir, 'frontend', 'build'),
    path.join(rootDir, 'frontend', 'dist')
];

console.log('🧼 Cleaning workspace build directories...');

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
for (const dir of dirsToClean) {
    try {
        if (fs.existsSync(dir)) {
            console.log(`Deleting: ${dir}`);
            deleteFolderRecursive(dir);
            cleanedAny = true;
        }
    } catch (error) {
        console.error(`❌ Failed to clean directory ${dir}:`, error.message);
    }
}

if (cleanedAny) {
    console.log('✅ Cleaned all compile and build target folders.');
} else {
    console.log('✨ Workspace is already clean.');
}
