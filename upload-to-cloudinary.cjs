// ============================================
//  CLOUDINARY BULK UPLOADER
//  Run: node upload-to-cloudinary.cjs
// ============================================

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

cloudinary.config({
  cloud_name: 'dsi45vpfz',
  api_key:    '392554513725553',
  api_secret: 'w2123OaDzydc7sbOtkqExvGEdHQ',
});

const STICKER_FOLDER = path.join(__dirname, 'STICKER');
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

function getAllImages(dir) {
  let results = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(getAllImages(fullPath));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (IMAGE_EXTENSIONS.includes(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function getCloudinaryFolder(filePath) {
  const relative = path.relative(__dirname, filePath);
  const folder = path.dirname(relative).replace(/\\/g, '/');
  return folder;
}

async function uploadAll() {
  console.log('\n Starting Cloudinary Upload...\n');

  const allImages = getAllImages(STICKER_FOLDER);
  const total = allImages.length;
  let uploaded = 0;
  let failed = 0;

  console.log('Found ' + total + ' images to upload\n');

  for (const filePath of allImages) {
    const folder = getCloudinaryFolder(filePath);
    const fileName = path.basename(filePath, path.extname(filePath));

    try {
      await cloudinary.uploader.upload(filePath, {
        folder: folder,
        public_id: fileName,
        use_filename: true,
        unique_filename: false,
        overwrite: false,
      });
      uploaded++;
      const percent = Math.round((uploaded / total) * 100);
      process.stdout.write('\r Uploaded: ' + uploaded + '/' + total + ' (' + percent + '%) -- ' + folder.split('/').pop() + '/' + fileName);
    } catch (err) {
      failed++;
      console.log('\n FAILED: ' + path.basename(filePath) + ' -- ' + err.message);
    }
  }

  console.log('\n\n============================================');
  console.log(' DONE! ' + uploaded + ' uploaded, ' + failed + ' failed');
  console.log('============================================\n');
  console.log('Base URL: https://res.cloudinary.com/dsi45vpfz/image/upload/\n');
}

uploadAll();
