// Gera os PNGs do app a partir dos SVGs em public/icons.  Uso: node scripts/gerar-icones.mjs
import sharp from "sharp";
const dir = new URL("../public/icons/", import.meta.url).pathname;
const jobs = [
  ["icon.svg", "icon-192.png", 192], ["icon.svg", "icon-512.png", 512],
  ["icon-maskable.svg", "maskable-512.png", 512], ["icon-maskable.svg", "apple-touch-icon.png", 180],
  ["icon.svg", "favicon-48.png", 48],
];
for (const [src, out, size] of jobs) {
  await sharp(dir + src, { density: 300 }).resize(size, size).png().toFile(dir + out);
}
console.log("Ícones gerados em public/icons");
