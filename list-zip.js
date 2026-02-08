import yauzl from 'yauzl';
import path from 'path';

const zipPath = process.argv[2];
if (!zipPath) {
    console.error('Usage: node list-zip.js <path-to-zip>');
    process.exit(1);
}

yauzl.open(zipPath, { lazyEntries: true }, (err, zipfile) => {
    if (err) throw err;
    zipfile.readEntry();
    zipfile.on('entry', (entry) => {
        console.log(entry.fileName);
        zipfile.readEntry();
    });
    zipfile.on('end', () => {
        // console.log('End of zip');
    });
});
