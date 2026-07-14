// ============================================
//  CLOUDINARY BULK UPLOADER
//  Run: node upload-to-cloudinary.js
// ============================================

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// ============================================
//  Set these in your shell before running, e.g.:
//  CLOUDINARY_CLOUD_NAME=xxx CLOUDINARY_API_KEY=xxx CLOUDINARY_API_SECRET=xxx node upload-to-cloudinary.js
// ============================================
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.error('Missing CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET env vars.');
  process.exit(1);
}
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});
// ============================================

const STICKER_FOLDER = path.join(__dirname, 'STICKER');
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];

// Recursively get all image files
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

// Convert local path to Cloudinary folder path
function getCloudinaryFolder(filePath) {
  const relative = path.relative(__dirname, filePath);
  const folder = path.dirname(relative).replace(/\\/g, '/');
  return folder;
}

async function uploadAll() {
  console.log('\n🚀 Starting Cloudinary Upload...\n');

  const allImages = getAllImages(STICKER_FOLDER);
  const total = allImages.length;
  let uploaded = 0;
  let failed = 0;

  console.log(`📁 Found ${total} images to upload\n`);

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
      process.stdout.write(`\r✅ ${uploaded}/${total} uploaded (${percent}%) — ${folder}/${fileName}`);
    } catch (err) {
      failed++;
      console.log(`\n❌ Failed: ${filePath} — ${err.message}`);
    }
  }

  console.log('\n\n============================================');
  console.log(`✅ Done! ${uploaded} uploaded, ${failed} failed`);
  console.log('============================================\n');
  console.log('Your images are now on Cloudinary!');
  console.log(`Base URL: https://res.cloudinary.com/YOUR_CLOUD_NAME/image/upload/\n`);
}

uploadAll();
