require("dotenv").config();
const fs = require("fs");
const path = require("path");
const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const screenshotDir = path.join(__dirname, "Prints");

// Cria a pasta se não existir
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir);
}

const DB_LOGIN = process.env.LOGIN;
const DB_PASSWORD = process.env.SENHA;

console.log("Variáveis de ambiente carregadas com sucesso.");

async function issDownload(driver) {
  console.log("Iniciando o download do ISS...");

  const loginUrl = "https://iss.speedgov.com.br/ico/";

  // Acessa a página de login
  try {
    await driver.get(loginUrl);
    console.log("Acessando a página de login...");
  } catch (e) {
    console.log("Erro ao acessar a página de login:", e.message);
    return [];
  }


  //Loga no sistema
  try {
    const inputLogin = await driver.findElement(By.id("inscricao"))
    inputLogin.sendKeys(DB_LOGIN);

    const inputSenha = await driver.findElement(By.id("senha"));
    inputSenha.sendKeys(DB_PASSWORD);

    console.log("Campos de login preenchidos com sucesso.");

    await driver.sleep(2000)

    //simula apertar a tecla Enter
    const enterBtn = await driver.findElement(By.css('button.btn.btn-block.btn-primary.mt-3'));
    await enterBtn.click();

    console.log("Enter cliclado, aguardando o carregamento da página...");

    await driver.sleep(10000);


  } catch (e) {
    console.log("Erro ao preencher os campos de login:", e.message);
    return [];
  }

  // Abre Notas Fiscais
  try {  
    console.log("Acessando Área do Prestador...");

    const area_prestador = await driver.findElement(By.css('a[title="Área do Prestador"]')) 
    await area_prestador.click();

    console.log("Área do Prestador acessada com sucesso.");

    await driver.sleep(5000);

    const notasFiscaisLink = await driver.findElement(By.css('a[href="/ico/modulo1/notas?utf8=✓&q%5Bnfecompmes_eq%5D=7&q%5Bnfecompano_eq%5D=2025&commit=Filtrar"]'));
    await notasFiscaisLink.click();

    console.log("Notas Fiscais clicado, aguardando o carregamento da página...");

    await driver.sleep(5000);

  } catch (e) {
    console.log("Erro ao acessar a Área do Prestador:", e.message);
    return [];
  }

  // Muda o mês 
  try {

  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  let data = new Date();
  let mesAtual = data.getMonth() + 1;  // 1 a 12
  let mesAnterior = mesAtual === 1 ? 12 : mesAtual - 1;

  // O valor do option é o mês com ".0"
  let mesAnteriorValue = mesAnterior + ".0"; // ex: "6.0"

  await driver.sleep(5000);
  console.log("Mudando o mês");

  // Executa o script no browser pra trocar o select
  await driver.executeScript(`
    const select = document.getElementsByName('q[nfecompmes_eq]')[0];
    select.value = "${mesAnteriorValue}";
    select.dispatchEvent(new Event('change'));
  `);

  console.log("Mês alterado com sucesso para:", meses[mesAnterior - 1]);

  await driver.sleep(5000);

  //aplicar o filtro 
  const botaoFiltrar = await driver.findElement(By.css('input[value="Filtrar"]'));
  await botaoFiltrar.click(); 

  console.log("Filtro aplicado, aguardando o carregamento dos dados...");

  await driver.sleep(10000);

  }catch (e) {
    console.log("Erro ao mudar o mês:", e.message);
    return [];
  }

  try{
    while(true){
    // Captura todas as linhas do tbody
    const linhas = await driver.findElements(By.css('table tbody tr'));
    console.log(`📄 ${linhas.length} linhas encontradas na página.`);

    for (let i = 0; i < linhas.length; i++) {
      try {
        // Dentro da linha, encontra o botão com data-original-title="Baixar XML"
        const botaoDownload = await linhas[i].findElement(By.css('[data-original-title="Baixar XML"]'));

        // Scroll até o botão
        await driver.executeScript(`
          const y = arguments[0].getBoundingClientRect().top + window.scrollY - 150;
          window.scrollTo({ top: y, behavior: 'instant' });
        `, botaoDownload);
        await driver.sleep(5000);

        // Clica no botão
        await driver.executeScript("arguments[0].click();", botaoDownload);
        console.log(`⬇️ Download da linha ${i + 1} iniciado.`);

        // Espera o download começar (ajusta se for lento)
        await driver.sleep(4000);
      } catch (e) {
        console.log(`⚠️ Falha na linha ${i + 1}:`, e.message);
      }
    }

      // Paginando para a próxima página
      let proximoBtn;
      try{
        proximoBtn = await driver.findElement(By.css('.next.next_page.page-item'));

        const classe = await proximoBtn.getAttribute('class');
        if (classe.includes('disabled') || !(await proximoBtn.isEnabled())) {
            console.log("Botão de próximo está desabilitado, saindo do loop.");
            break; // Sai do loop se o botão estiver desabilitado
        }

        await driver.executeScript("arguments[0].scrollIntoView(true);", proximoBtn);
        await proximoBtn.click();

        await driver.sleep(5000); 

      }catch (e) {
        console.log("Erro ao tentar encontrar o botão de próximo:", e.message);
        break; // Sai do loop se não encontrar o botão
      }    
    }
    
  }catch (e) {
    console.log("Paginação e Download deram erro:", e.message);
    return [];
  }


}


async function executarISS() {
  console.log("Iniciando o processo de download do ISS...");

  let options = new chrome.Options();
  
  // Configurações de execução
  options.addArguments([
    // Descomente a linha abaixo para modo headless se necessário
    // "--headless=new", 
    "--window-size=1920,1080",
    "--disable-gpu",
    "--no-sandbox",
    "--start-maximized",
    "--disable-dev-shm-usage",
    "--safebrowsing-disable-download-protection",
    "--disable-features=DownloadBubble,DownloadBubbleV2",
    "--disable-blink-features=AutomationControlled"
  ]);

  // Configurações específicas para downloads
  const downloadDir = path.join("C:", "Downloads");
  let prefs = {
  "profile.default_content_settings.popups": 0,
  "download.prompt_for_download": false,
  "download.directory_upgrade": true,
  "download.default_directory": downloadDir,
  "safebrowsing.enabled": true, // precisa estar true ou o Chrome ignora
  "safebrowsing.disable_download_protection": true, // força o ignore no warning
  "plugins.always_open_pdf_externally": true
};
  
  options.setUserPreferences(prefs);

  // Configurações adicionais para evitar detecção como bot
  options.setAcceptInsecureCerts(true);
  options.excludeSwitches("enable-automation");

  let driver;
  try {
    driver = await new Builder()
      .forBrowser("chrome")
      .setChromeOptions(options)
      .build();

    // Configurar tempo de espera padrão
    await driver.manage().setTimeouts({
      implicit: 10000,
      pageLoad: 30000,
      script: 30000
    });

    // Criar diretório de downloads se não existir
    const fs = require('fs');
    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    await issDownload(driver);
    
  } catch (e) {
    console.log("Erro durante o processo de download:", e.message);
    // Capturar screenshot em caso de erro
    if (driver) {
      const screenshot = await driver.takeScreenshot();
      fs.writeFileSync('erro_download.png', screenshot, 'base64');
    }
  } finally {
    if (driver) {
      await driver.quit();
    }
  }
}

executarISS();
