// test-runner.js - Verifikasi menyeluruh setiap section dengan screenshot spesifik
const { spawn } = require('child_process');
const fs = require('fs');

async function runTest() {
  console.log('1. Memulai Chrome headless...');
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--remote-debugging-port=9226',
    '--remote-allow-origins=*',
    '--disable-gpu',
    '--window-size=1440,3200',
    'http://localhost:3000/'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const listRes = await fetch('http://127.0.0.1:9226/json');
    const tabs = await listRes.json();
    const tab = tabs.find(t => t.url.includes('localhost:3000'));
    if (!tab) {
      console.error('Tab tidak ditemukan');
      return;
    }

    const ws = new WebSocket(tab.webSocketDebuggerUrl);
    let id = 1;
    const callbacks = {};

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && callbacks[msg.id]) {
        callbacks[msg.id](msg.result);
        delete callbacks[msg.id];
      }
    };

    await new Promise(r => ws.onopen = r);

    const send = (method, params = {}) => new Promise((resolve) => {
      const reqId = id++;
      callbacks[reqId] = resolve;
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });

    await send('Runtime.enable');
    await send('Page.enable');

    console.log('2. Menunggu rendering selesai...');
    await new Promise(r => setTimeout(r, 2500));

    // Ambil Section Pangsa & Bump Chart
    console.log('3. Scroll ke Section Peringkat & Komparasi...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('sectionPeringkat')?.scrollIntoView({ behavior: 'instant' });`
    });
    await new Promise(r => setTimeout(r, 800));
    const shotRank = await send('Page.captureScreenshot', { format: 'png' });
    if (shotRank && shotRank.data) {
      fs.writeFileSync('C:\\TRIAN\\Tugas\\STATISTIKA\\screenshot_rank_compare.png', Buffer.from(shotRank.data, 'base64'));
      console.log('Tersimpan di screenshot_rank_compare.png');
    }

    // Scroll ke Section Statistik
    console.log('4. Scroll ke Section Tabel Statistik...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('sectionStatistik')?.scrollIntoView({ behavior: 'instant' });`
    });
    await new Promise(r => setTimeout(r, 800));
    const shotStats = await send('Page.captureScreenshot', { format: 'png' });
    if (shotStats && shotStats.data) {
      fs.writeFileSync('C:\\TRIAN\\Tugas\\STATISTIKA\\screenshot_stats.png', Buffer.from(shotStats.data, 'base64'));
      console.log('Tersimpan di screenshot_stats.png');
    }

    // Scroll ke Section Insight & Temuan
    console.log('5. Scroll ke Section Insight...');
    await send('Runtime.evaluate', {
      expression: `document.getElementById('sectionInsight')?.scrollIntoView({ behavior: 'instant' });`
    });
    await new Promise(r => setTimeout(r, 800));
    const shotInsight = await send('Page.captureScreenshot', { format: 'png' });
    if (shotInsight && shotInsight.data) {
      fs.writeFileSync('C:\\TRIAN\\Tugas\\STATISTIKA\\screenshot_insights.png', Buffer.from(shotInsight.data, 'base64'));
      console.log('Tersimpan di screenshot_insights.png');
    }

    // Scroll kembali ke atas untuk cek Hero & Navbar
    console.log('6. Scroll kembali ke atas (Hero & Navbar)...');
    await send('Runtime.evaluate', {
      expression: `window.scrollTo({ top: 0, behavior: 'instant' });`
    });
    await new Promise(r => setTimeout(r, 800));
    const shotHero = await send('Page.captureScreenshot', { format: 'png' });
    if (shotHero && shotHero.data) {
      fs.writeFileSync('C:\\TRIAN\\Tugas\\STATISTIKA\\screenshot_hero_nav.png', Buffer.from(shotHero.data, 'base64'));
      console.log('Tersimpan di screenshot_hero_nav.png');
    }

    console.log('7. Pengambilan screenshot seluruh bagian sukses!');
    ws.close();
  } catch (err) {
    console.error('Error:', err);
  } finally {
    chrome.kill();
  }
}

runTest();
