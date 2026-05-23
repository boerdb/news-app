const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const iconsDir = path.join("public", "icons");
const BRAND = "#2563eb";

fs.mkdirSync(iconsDir, { recursive: true });

function newsIconMarkup(size) {
  const c = size / 2;
  const barW = size * 0.08;
  const baseY = size * 0.72;
  const bars = [
    { x: c - size * 0.22, h: size * 0.22 },
    { x: c - size * 0.06, h: size * 0.32 },
    { x: c + size * 0.1, h: size * 0.18 },
  ];
  const barRects = bars
    .map(
      (b) =>
        `<rect x="${b.x - barW / 2}" y="${baseY - b.h}" width="${barW}" height="${b.h}" rx="${barW / 2}" fill="#ffffff"/>`,
    )
    .join("");
  return [
    `<rect x="${size * 0.18}" y="${size * 0.2}" width="${size * 0.64}" height="${size * 0.52}" rx="${size * 0.06}" fill="#ffffff" opacity="0.95"/>`,
    `<line x1="${size * 0.28}" y1="${size * 0.34}" x2="${size * 0.72}" y2="${size * 0.34}" stroke="${BRAND}" stroke-width="${size * 0.025}" stroke-linecap="round"/>`,
    `<line x1="${size * 0.28}" y1="${size * 0.44}" x2="${size * 0.6}" y2="${size * 0.44}" stroke="${BRAND}" stroke-width="${size * 0.025}" stroke-linecap="round" opacity="0.7"/>`,
    barRects,
  ].join("");
}

function wrapSvg(size, rounded = true) {
  const rx = rounded ? Math.round(size * 0.15) : 0;
  return Buffer.from(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
      `<rect width="${size}" height="${size}" rx="${rx}" fill="${BRAND}"/>`,
      newsIconMarkup(size),
      "</svg>",
    ].join(""),
  );
}

async function writeIcon(size) {
  const base = `icon-${size}x${size}`;
  const svg = wrapSvg(size, true);
  fs.writeFileSync(path.join(iconsDir, `${base}.svg`), svg);
  await sharp(svg).png().toFile(path.join(iconsDir, `${base}.png`));

  const maskableSvg = wrapSvg(size, false);
  await sharp(maskableSvg)
    .png()
    .toFile(path.join(iconsDir, `${base}-maskable.png`));
}

async function main() {
  await writeIcon(180);
  await writeIcon(192);
  await writeIcon(512);
  console.log("PWA-iconen aangemaakt in public/icons/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
