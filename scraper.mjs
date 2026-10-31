// Multi-space parallel scraper for findaphd.com
// KEY FIX: visit homepage first in each space to pass Cloudflare, then navigate

const LIST_SPACE = "findaphd-list-v2";
const WORKER_SPACES = ["findaphd-w1-v2", "findaphd-w2-v2", "findaphd-w3-v2"];

// ─── Helper: pass Cloudflare by visiting homepage first ───
async function passCloudflare(page) {
  await page.goto("https://www.findaphd.com/");
  await page.waitForLoadState();
  for (let i = 0; i < 30; i++) {
    const title = await page.title();
    if (!title.includes('稍候') && !title.includes('Just a moment') && !title.includes('Checking')) return;
    await page.waitForTimeout(2000);
  }
}

// ─── Helper: extract project data ───
function extractProjectData() {
  const title = document.querySelector('h1.phd-header__phd-title')
    ?.textContent.replace(/\s+/g, ' ').trim()
    .replace(/^(Add|Remove) to shortlist\s*/i, '');
  const university = document.querySelector('a.phd-header__institution')?.textContent.trim();
  const school = document.querySelector('a.phd-header__department')?.textContent.trim();
  const keyInfo = [...document.querySelectorAll('.key-info__content')]
    .map(el => el.textContent.replace(/\s+/g, ' ').trim());
  const supervisor = keyInfo.find(t => /^(Dr|Prof|Mr|Mrs|Ms)\.?\s/.test(t)) || '';
  const deadline = keyInfo.find(t => /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/.test(t)) || '';
  const funding = keyInfo.find(t => /funded|studentship|stipend|self.funded|phd project/i.test(t)) || '';
  const badges = [...document.querySelectorAll('a.phd-data')].map(a => a.textContent.trim());
  const city = badges.find(t => t && t !== 'United Kingdom' && !t.includes(' '));
  const country = badges.find(t => t === 'United Kingdom');
  const subjects = badges.filter(t => t !== city && t !== country);
  const aboutHeading = Array.from(document.querySelectorAll('h2, h3, h4'))
    .find(el => el.textContent?.trim().toLowerCase().includes('about the project'));
  let aboutText = '';
  if (aboutHeading) {
    let node = aboutHeading.parentElement?.nextElementSibling || aboutHeading.nextElementSibling;
    const chunks = [];
    while (node) {
      if (node.tagName?.match(/^H[1-6]$/)) break;
      if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') { node = node.nextElementSibling; continue; }
      const t = node.textContent?.trim();
      if (t && t.length > 50) chunks.push(t);
      node = node.nextElementSibling;
    }
    aboutText = chunks.join('\n\n').trim().slice(0, 3000);
  }
  return { title, university, school, supervisor, deadline, fundingType: funding, city: city||'', country: country||'', subjects, aboutTheProject: aboutText, url: location.href };
}

// ─── Worker: scrape a batch of URLs ───
async function scrapeBatch(spaceName, urls) {
  const task = await taskSpace(spaceName);
  const page = task.page("p1");
  await passCloudflare(page); // pass CF first
  const results = [];
  const errors = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      await page.goto(urls[i]);
      await page.waitForLoadState();
      await page.waitForTimeout(1200);
      const data = await page.evaluate(extractProjectData);
      results.push(data);
    } catch (e) { errors.push({ url: urls[i], error: e.message }); }
    await page.waitForTimeout(500);
  }
  await task.finish({ keep: [] });
  return { results, errors };
}

// ─── Main ───
console.log("=== Step 1: Fetching project URL list ===");
const listTask = await taskSpace(LIST_SPACE);
const listPage = listTask.page("p1");
await passCloudflare(listPage);
await listPage.goto("https://www.findaphd.com/phds/latest/");
await listPage.waitForLoadState();
await listPage.waitForTimeout(3000);

const allUrls = await listPage.evaluate(() => {
  const all = Array.from(document.querySelectorAll('a[href*="/phds/project/"]'));
  return [...new Set(all.map(a => a.href))];
});
await listTask.finish({ keep: [] });
console.log(`Found ${allUrls.length} project URLs`);

const testUrls = allUrls.slice(0, 30);
const batchSize = Math.ceil(testUrls.length / WORKER_SPACES.length);
const batches = WORKER_SPACES.map((_, i) => testUrls.slice(i * batchSize, (i + 1) * batchSize));

console.log(`\n=== Step 2: ${WORKER_SPACES.length} workers in parallel, ${batches.map(b=>b.length).join('+')} URLs ===`);
const workerPromises = WORKER_SPACES.map((name, i) => scrapeBatch(name, batches[i]));
const workerResults = await Promise.all(workerPromises);

const allResults = [];
const allErrors = [];
workerResults.forEach((r, i) => {
  console.log(`  ${WORKER_SPACES[i]}: ${r.results.length} OK, ${r.errors.length} errors`);
  allResults.push(...r.results);
  allErrors.push(...r.errors);
});
console.log(`\n=== Total: ${allResults.length} scraped, ${allErrors.length} errors ===`);

// ─── Convert to PhDRadar format ───
const today = new Date().toISOString().slice(0, 10);
const months = { January:'01',February:'02',March:'03',April:'04',May:'05',June:'06',July:'07',August:'08',September:'09',October:'10',November:'11',December:'12' };
const phdRadarJobs = allResults.map(d => {
  let deadlineIso = '';
  if (d.deadline) {
    const m = d.deadline.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/);
    if (m) deadlineIso = `${m[3]}-${months[m[1]]}-${m[2].padStart(2,'0')}`;
  }
  let eligibility = 'check';
  if (/UK Students Only/i.test(d.fundingType||'')) eligibility = 'UK only';
  else if (/Worldwide|International/i.test(d.fundingType||'')) eligibility = 'International';
  return {
    level: 'phd',
    eligibility,
    funding: d.fundingType || 'unknown',
    title: d.title || '',
    institution: d.university || '',
    country: d.country || '',
    city: d.city || '',
    deadline: deadlineIso,
    posted: today,
    source: 'findaphd',
    url: d.url,
    flags: d.subjects.join('; '),
    fetched_at: new Date().toISOString()
  };
});

// Save
const fs = await import("node:fs/promises");
const outDir = "C:/Users/28030/ego/findaphd-batch-20261101";
await fs.writeFile(`${outDir}/raw-results.json`, JSON.stringify({ scrapedAt: new Date().toISOString(), count: allResults.length, results: allResults }, null, 2), "utf-8");
await fs.writeFile(`${outDir}/phdradar-jobs.json`, JSON.stringify(phdRadarJobs, null, 2), "utf-8");
const csvHeader = "level,eligibility,funding,title,institution,country,city,deadline,posted,source,url,flags,fetched_at";
const csvRows = phdRadarJobs.map(j => {
  const esc = v => `"${String(v||'').replace(/"/g,'""')}"`;
  return [j.level,j.eligibility,j.funding,j.title,j.institution,j.country,j.city,j.deadline,j.posted,j.source,j.url,j.flags,j.fetched_at].map(esc).join(',');
});
await fs.writeFile(`${outDir}/phdradar-jobs.csv`, [csvHeader, ...csvRows].join('\n'), "utf-8");

console.log(`\n=== Saved: raw-results.json, phdradar-jobs.json, phdradar-jobs.csv ===`);
console.log("\n=== Sample PhDRadar entry ===");
console.log(JSON.stringify(phdRadarJobs[0], null, 2));
