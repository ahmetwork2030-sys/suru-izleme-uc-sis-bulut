const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch();
  const errs = [];
  for (const [name, vp, scheme] of [['desk', {width:1280,height:1000}, 'light'], ['phone', {width:400,height:900}, 'dark']]) {
    const p = await b.newPage({ viewport: vp, colorScheme: scheme, deviceScaleFactor: 1 });
    p.on('console', m => { if (m.type()==='error') errs.push(name+': '+m.text()); });
    p.on('pageerror', e => errs.push(name+' pageerror: '+e.message));
    await p.goto('file://' + process.argv[2]);
    await p.waitForTimeout(2500);
    await p.screenshot({ path: process.argv[3] + '_' + name + '.png', fullPage: true });
    const sw = await p.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
    console.log(name, 'scrollWidth', sw);
  }
  console.log('errors:', errs);
  await b.close();
})();
