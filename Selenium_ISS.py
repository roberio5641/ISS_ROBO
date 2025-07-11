import os
import time
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options

# Carrega variáveis do .env
load_dotenv()
DB_LOGIN = os.getenv("LOGIN")
DB_PASSWORD = os.getenv("SENHA")

def iss_download(driver):
    print("🚀 Iniciando o processo de download do ISS...")
    driver.get("https://iss.speedgov.com.br/ico/")
    time.sleep(2)

    # Login
    try:
        driver.find_element(By.ID, "inscricao").send_keys(DB_LOGIN)
        driver.find_element(By.ID, "senha").send_keys(DB_PASSWORD)
        driver.find_element(By.CSS_SELECTOR, "button.btn.btn-block.btn-primary.mt-3").click()
        print("✅ Login efetuado.")
        time.sleep(10)
    except Exception as e:
        print("❌ Erro no login:", e)
        return

    # Acessa área do prestador
    try:
        driver.find_element(By.CSS_SELECTOR, 'a[title="Área do Prestador"]').click()
        time.sleep(5)
        driver.find_element(By.CSS_SELECTOR, 'a[href*="/ico/modulo1/notas"]').click()
        print("📥 Acessou Notas Fiscais.")
        time.sleep(5)
    except Exception as e:
        print("❌ Erro ao acessar área do prestador:", e)
        return

    # Seleciona mês anterior
    try:
        meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
        agora = time.localtime()
        mes_atual = agora.tm_mon
        mes_anterior = 12 if mes_atual == 1 else mes_atual - 1
        valor_select = f"{mes_anterior}.0"

        time.sleep(2)
        driver.execute_script(f"""
            const select = document.getElementsByName('q[nfecompmes_eq]')[0];
            select.value = "{valor_select}";
            select.dispatchEvent(new Event('change'));
        """)
        print(f"📆 Mês alterado para: {meses[mes_anterior - 1]}")
        time.sleep(3)

        driver.find_element(By.CSS_SELECTOR, 'input[value="Filtrar"]').click()
        print("🔍 Filtro aplicado.")
        time.sleep(8)
    except Exception as e:
        print("❌ Erro ao mudar mês:", e)
        return

    # Loop de download por página
    try:
        while True:
            linhas = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
            print(f"📄 {len(linhas)} notas encontradas na página.")

            for i, linha in enumerate(linhas):
                try:
                    botao = linha.find_element(By.CSS_SELECTOR, '[data-original-title="Baixar XML"]')

                    # Scroll com offset
                    driver.execute_script("""
                        const y = arguments[0].getBoundingClientRect().top + window.scrollY - 150;
                        window.scrollTo({ top: y, behavior: 'instant' });
                    """, botao)
                    time.sleep(0.5)

                    # Clique via JS
                    driver.execute_script("arguments[0].click();", botao)
                    print(f"⬇️ XML da linha {i + 1} baixado.")
                    time.sleep(2)
                except Exception as e:
                    print(f"⚠️ Erro no download da linha {i + 1}:", e)

            # Paginar
            try:
                botao_proximo = driver.find_element(By.CSS_SELECTOR, ".next.next_page.page-item")
                if "disabled" in botao_proximo.get_attribute("class"):
                    print("✅ Fim da paginação.")
                    break

                driver.execute_script("arguments[0].scrollIntoView(true);", botao_proximo)
                botao_proximo.click()
                print("➡️ Indo para próxima página...")
                time.sleep(5)
            except Exception as e:
                print("❌ Erro ao paginar:", e)
                break
    except Exception as e:
        print("❌ Erro geral na automação:", e)

def executar_iss():
    print("🎬 Executando automação do ISS...")
    options = Options()
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-gpu")
    options.add_argument("--no-sandbox")
    options.add_argument("--start-maximized")
    # options.add_argument("--headless=new")  # Descomente se quiser headless

    driver = webdriver.Chrome(options=options)
    try:
        iss_download(driver)
    finally:
        driver.quit()
        print("🔚 Automação finalizada.")

if __name__ == "__main__":
    executar_iss()
