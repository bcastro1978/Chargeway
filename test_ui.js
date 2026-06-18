const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando prueba automatizada visual...');
  
  // Launch Chrome visible to the user
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    console.log('Navegando a la app local...');
    await page.goto('http://localhost:3004/', { waitUntil: 'networkidle2' });
    
    // Esperar un par de segundos para que el mapa cargue
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Ingresando Origen: Guayaquil');
    await page.waitForSelector('input[placeholder="Origen"]');
    await page.type('input[placeholder="Origen"]', 'Guayaquil', { delay: 100 });
    // Esperar sugerencias y cliquear la primera
    await page.waitForSelector('div[style*="z-index: 2001"]'); // Dropdown container
    await new Promise(r => setTimeout(r, 1500)); // wait for network response
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('div'));
      const guayaquilOpt = options.find(el => el.innerText && el.innerText.includes('Guayaquil') && el.style.padding === '12px');
      if (guayaquilOpt) guayaquilOpt.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('Ingresando Destino: Cuenca');
    await page.waitForSelector('input[placeholder="Destino"]');
    await page.type('input[placeholder="Destino"]', 'Cuenca', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('div'));
      const cuencaOpt = options.find(el => el.innerText && el.innerText.includes('Cuenca') && el.style.padding === '12px');
      if (cuencaOpt) cuencaOpt.click();
    });

    await new Promise(r => setTimeout(r, 2000));

    console.log('Añadiendo parada: Riobamba');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const addBtn = buttons.find(b => b.innerText && b.innerText.includes('Añadir parada'));
      if (addBtn) addBtn.click();
    });

    await new Promise(r => setTimeout(r, 1000));

    await page.waitForSelector('input[placeholder="Añadir parada"]');
    await page.type('input[placeholder="Añadir parada"]', 'Riobamba', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const options = Array.from(document.querySelectorAll('div'));
      const rioOpt = options.find(el => el.innerText && el.innerText.includes('Riobamba') && el.style.padding === '12px');
      if (rioOpt) rioOpt.click();
    });

    console.log('Esperando cálculo de ruta (5 segundos)...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Iniciando viaje');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const initBtn = buttons.find(b => b.innerText && b.innerText.includes('Iniciar Viaje'));
      if (initBtn) initBtn.click();
    });

    console.log('Simulando navegación por 6 segundos...');
    await new Promise(r => setTimeout(r, 6000));

    console.log('Deteniendo viaje');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const stopBtn = buttons.find(b => b.innerText && b.innerText.includes('Detener viaje'));
      if (stopBtn) stopBtn.click();
    });

    console.log('Prueba finalizada. Dejando el navegador abierto por 10 segundos más.');
    await new Promise(r => setTimeout(r, 10000));

  } catch (error) {
    console.error('Ocurrió un error en la prueba:', error);
  } finally {
    console.log('Cerrando navegador automatizado.');
    await browser.close();
  }
})();
