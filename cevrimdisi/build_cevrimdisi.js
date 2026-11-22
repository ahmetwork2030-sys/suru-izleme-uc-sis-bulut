// İnternetsiz çalışan tek dosyalık sürüm: cevrimdisi/Suru_Izleme_Simulatoru.html
// Yazı tipleri (OFL lisanslı Inter, Space Grotesk, IBM Plex Mono) dosyanın içine gömülür; dış bağlantı yoktur.
// Önce `node build.js` çalıştırılmış olmalı (dist/index.html).
const fs = require('fs'), path = require('path');
const kok = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(kok, 'dist/index.html'), 'utf8');
const LATIN = 'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const LATIN_EXT = 'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';
const b64 = f => fs.readFileSync(path.join(__dirname, 'fontlar', f)).toString('base64');
const yuz = (aile, agirlik, dosya, aralik) =>
  `@font-face{font-family:"${aile}";font-style:normal;font-display:swap;font-weight:${agirlik};src:url(data:font/woff2;base64,${b64(dosya)}) format("woff2");unicode-range:${aralik};}`;
const fontCss = [
  yuz('Inter', '100 900', 'inter-latin-ext-wght-normal.woff2', LATIN_EXT),
  yuz('Inter', '100 900', 'inter-latin-wght-normal.woff2', LATIN),
  yuz('Space Grotesk', '300 700', 'space-grotesk-latin-ext-wght-normal.woff2', LATIN_EXT),
  yuz('Space Grotesk', '300 700', 'space-grotesk-latin-wght-normal.woff2', LATIN),
  yuz('IBM Plex Mono', '400', 'ibm-plex-mono-latin-ext-400-normal.woff2', LATIN_EXT),
  yuz('IBM Plex Mono', '400', 'ibm-plex-mono-latin-400-normal.woff2', LATIN),
  yuz('IBM Plex Mono', '500', 'ibm-plex-mono-latin-ext-500-normal.woff2', LATIN_EXT),
  yuz('IBM Plex Mono', '500', 'ibm-plex-mono-latin-500-normal.woff2', LATIN),
].join('\n');
// Google Fonts bağlantılarını çıkar
html = html.replace(/<link rel="preconnect"[^>]*>\s*/g, '').replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/g, '');
if (/https:\/\/fonts\./.test(html)) throw new Error('dış yazı tipi bağlantısı kaldı');
html = '<!DOCTYPE html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
  html.replace('<style>', '<style>\n' + fontCss + '\n') + '\n</html>\n';
const cikis = path.join(__dirname, 'Suru_Izleme_Simulatoru.html');
fs.writeFileSync(cikis, html);
console.log(path.basename(cikis), (html.length / 1024).toFixed(0) + ' KB');
