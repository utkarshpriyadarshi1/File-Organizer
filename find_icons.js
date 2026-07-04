const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./ui/src');
let icons = new Set();
files.forEach(f => {
    const content = fs.readFileSync(f, 'utf8');
    const match = content.match(/import\s+\{([^}]+)\}\s+from\s+['\"]@ant-design\/icons['\"]/);
    if (match) {
        match[1].split(',').forEach(icon => {
            const i = icon.trim();
            if (i) icons.add(i);
        });
    }
});
console.log(Array.from(icons).join(', '));
