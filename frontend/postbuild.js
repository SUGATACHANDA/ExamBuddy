// postbuild.js
const fs = require('fs-extra');

console.log('--- Running post-build script ---');
const buildDir = './build';

try {
    // We ONLY need to copy electron.js and preload.js
    // fs.copySync('./public/electron-prod.js', `${buildDir}/electron.js`);
    fs.copySync('./public/electron-prod.js', `${buildDir}/electron.js`);
    fs.copySync('./public/preload.js', `${buildDir}/preload.js`);
    fs.copySync('./package.json', `${buildDir}/package.json`);
    console.log('SUCCESS: Copied essential Electron files to build directory.');
} catch (err) {
    console.error('ERROR: Could not copy files:', err);
    process.exit(1);
}

console.log('--- Post-build script finished successfully ---');