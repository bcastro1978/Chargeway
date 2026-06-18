const puppeteer = require('puppeteer');

(async () => {
  console.log('Iniciando prueba de estrés visual (5 Puntos)...');
  
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--start-maximized']
  });
  
  const page = await browser.newPage();
  
  try {
    await page.goto('http://localhost:3004/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2000));
    
    // Función auxiliar para seleccionar sugerencias
    const selectSuggestion = async (searchStr) => {
      await page.waitForSelector('div[style*="z-index: 2001"]', { timeout: 5000 });
      await new Promise(r => setTimeout(r, 1500));
      await page.evaluate((text) => {
        const options = Array.from(document.querySelectorAll('div'));
        const opt = options.find(el => el.innerText && el.innerText.toLowerCase().includes(text.toLowerCase()) && el.style.padding === '12px');
        if (opt) opt.click();
      }, searchStr);
      await new Promise(r => setTimeout(r, 1000));
    };

    const addStopButton = async () => {
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const addBtn = buttons.find(b => b.innerText && b.innerText.includes('Añadir parada'));
        if (addBtn) addBtn.click();
      });
      await new Promise(r => setTimeout(r, 800));
    };

    console.log('Ingresando Origen: Quito');
    await page.waitForSelector('input[placeholder="Origen"]');
    await page.type('input[placeholder="Origen"]', 'Quito', { delay: 100 });
    await selectSuggestion('Quito');
    
    console.log('Ingresando Destino: Papallacta');
    await page.waitForSelector('input[placeholder="Destino"]');
    await page.type('input[placeholder="Destino"]', 'Papallacta', { delay: 100 });
    await selectSuggestion('Papallacta');

    // Añadir 3 paradas intermedias
    const paradas = ['Cumbaya', 'Tumbaco', 'Pifo'];
    for (let i = 0; i < paradas.length; i++) {
      console.log(`Añadiendo parada ${i + 1}: ${paradas[i]}`);
      await addStopButton();
      
      // El nuevo input de parada siempre es el penúltimo input (el último es Destino)
      await page.evaluate((text) => {
        const inputs = Array.from(document.querySelectorAll('input[placeholder="Añadir parada"]'));
        const lastInput = inputs[inputs.length - 1]; // siempre el recién añadido
        lastInput.focus();
      });
      await page.keyboard.type(paradas[i], { delay: 100 });
      await selectSuggestion(paradas[i]);
    }

    console.log('Esperando cálculo de la ruta completa (5 segundos)...');
    await new Promise(r => setTimeout(r, 5000));

    console.log('Iniciando viaje...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const initBtn = buttons.find(b => b.innerText && b.innerText.includes('Iniciar Viaje'));
      if (initBtn) initBtn.click();
    });

    console.log('Navegando por 8 segundos...');
    await new Promise(r => setTimeout(r, 8000));

    console.log('Deteniendo viaje...');
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const stopBtn = buttons.find(b => b.innerText && b.innerText.includes('Detener viaje'));
      if (stopBtn) stopBtn.click();
    });

    console.log('Prueba exitosa. Dejando navegador abierto por 10 segundos...');
    await new Promise(r => setTimeout(r, 10000));

  } catch (error) {
    console.error('Ocurrió un error en la prueba:', error);
  } finally {
    console.log('Cerrando navegador...');
    await browser.close();
  }
})();
