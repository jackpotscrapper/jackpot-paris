const puppeteer = require('puppeteer');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
  await page.setRequestInterception(true);
  page.on('request', req => ['image','font','media'].includes(req.resourceType()) ? req.abort() : req.continue());

  await page.goto('https://www.clubmontmartre-paris.com/', { waitUntil: 'networkidle2', timeout: 45000 });
  await sleep(5000);

  const result = await page.evaluate(() => {
    const output = [];

    // Dump complet de chaque jk-card avec tous ses attributs et enfants
    document.querySelectorAll('div.jk-card').forEach((card, i) => {
      const cardInfo = {
        index: i,
        card_class: card.className,
        card_id: card.id,
        card_attrs: {},
        meter: null
      };

      // Tous les attributs de la card
      for (const attr of card.attributes) {
        cardInfo.card_attrs[attr.name] = attr.value;
      }

      // Le jk-meter à l'intérieur
      const meter = card.querySelector('div.jk-meter');
      if (meter) {
        cardInfo.meter = {
          class: meter.className,
          id: meter.id,
          attrs: {},
          children: []
        };
        for (const attr of meter.attributes) {
          cardInfo.meter.attrs[attr.name] = attr.value;
        }
        // Tous les enfants du meter
        meter.querySelectorAll('*').forEach(child => {
          const childInfo = {
            tag: child.tagName,
            class: child.className,
            id: child.id,
            attrs: {},
            text: child.textContent.trim().slice(0, 60)
          };
          for (const attr of child.attributes) {
            childInfo.attrs[attr.name] = attr.value;
          }
          cardInfo.meter.children.push(childInfo);
        });
      }

      output.push(cardInfo);
    });

    return output;
  });

  console.log('=== DUMP COMPLET DES JK-CARDS ===\n');
  result.forEach(card => {
    console.log(`\n--- Card #${card.index} ---`);
    console.log('card.class:', card.card_class);
    console.log('card.id:', card.card_id);
    console.log('card.attrs:', JSON.stringify(card.card_attrs));
    if (card.meter) {
      console.log('meter.class:', card.meter.class);
      console.log('meter.attrs:', JSON.stringify(card.meter.attrs));
      card.meter.children.forEach(c => {
        console.log(`  child <${c.tag}> class="${c.class}" id="${c.id}" attrs=${JSON.stringify(c.attrs)} text="${c.text}"`);
      });
    }
  });

  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });
