const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
async function main() {
  const root = path.resolve(__dirname, '../../..');
  for (const [source, target, width] of [['BFL_CALL_1.png','bottle',768],['BFL_CALL_2.png','freeform',768],['BFL_CALL_3.png','campaign',1024]]) {
    const output = path.resolve(__dirname, '../public/brand', target + '.webp');
    await sharp(path.join(root,source)).resize({width,withoutEnlargement:true}).webp({quality:86}).toFile(output);
    console.log(target, fs.statSync(output).size);
  }
}
main();
