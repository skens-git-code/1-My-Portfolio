const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

// Folder paths
const inputDir = './images';
const outputDir = './images/optimized';

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const validExtensions = ['.jpg', '.jpeg', '.png', '.webp'];

async function runOptimization() {
  const files = fs.readdirSync(inputDir);
  for (const file of files) {
    const inputFilePath = path.join(inputDir, file);
    if (!fs.statSync(inputFilePath).isFile()) continue;

    const ext = path.extname(file).toLowerCase();
    if (!validExtensions.includes(ext)) continue;

    const fileNameWithoutExt = path.basename(file, ext);
    const outputFilePath = path.join(outputDir, `${fileNameWithoutExt}.webp`);

    try {
      await sharp(inputFilePath)
        .resize({ width: 800, withoutEnlargement: true }) // Never blow up small images
        .webp({ quality: 80 })
        .toFile(outputFilePath);

      const originalSize = (fs.statSync(inputFilePath).size / 1024).toFixed(1);
      const optimizedSize = (fs.statSync(outputFilePath).size / 1024).toFixed(1);
      console.log(`✓ ${file}: ${originalSize}KB -> ${optimizedSize}KB (.webp)`);
    } catch (err) {
      console.error(`Error processing ${file}:`, err);
    }
  }
  console.log('All images optimized successfully!');
}

runOptimization();
