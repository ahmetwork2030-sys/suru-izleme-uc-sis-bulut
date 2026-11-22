// Tek dosyalık sayfayı üretir: dist/index.html (motor + arayüz + toplu deney özeti gömülü)
const fs = require('fs'), path = require('path');
const R = p => fs.readFileSync(path.join(__dirname, p), 'utf8');
const ozet = JSON.parse(R('deney/ozet.json'));
const html = R('src/index.template.html')
  .replace('/*__ENGINE__*/', () => R('src/engine.js') + '\n' + R('src/kayit.js'))
  .replace('/*__OZET__*/', () => JSON.stringify(ozet))
  .replace('/*__APP__*/', () => fs.readdirSync(path.join(__dirname, 'src/ui')).filter(f => f.endsWith('.js')).sort().map(f => R('src/ui/' + f)).join('\n'));
fs.mkdirSync(path.join(__dirname, 'dist'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'dist/index.html'), html);
console.log('dist/index.html', (html.length / 1024).toFixed(0) + ' KB');
// Docker simülatörü aynı hesap motorunu kullanır
fs.copyFileSync(path.join(__dirname, 'src/engine.js'), path.join(__dirname, 'docker/simulator/engine.js'));
console.log('docker/simulator/engine.js güncellendi');
