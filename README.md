Projeto Hygeia
📜 Sobre o Projeto
Hygeia é um ecossistema multiplataforma integrado (IoT, Desktop e Mobile) projetado para a automação, controle e monitoramento de testes bacteriológicos em laboratório. A solução visa trazer mais segurança, rastreabilidade e eficiência ao processo de testes de sensibilidade a antibióticos, desde a preparação da amostra até a consulta dos resultados.



O sistema é composto por três pilares principais:


Hardware (IoT): Uma rede de dispositivos inteligentes baseados em ESP32 que executam as tarefas físicas, como a preparação de placas de cultura e o monitoramento ambiental.




Aplicação Desktop: O cérebro do sistema, desenvolvido em Electron, que serve como a interface central de controle, gerenciamento de testes, autenticação de usuários e geração de resultados.




Aplicação Mobile: Um leitor de QR Code em React Native que permite a consulta rápida e portátil dos resultados dos testes, garantindo a rastreabilidade em qualquer lugar.


✨ Funcionalidades Principais
Desktop

Gestão de Usuários e Funcionários: Sistema completo de autenticação e cadastro de funcionários.




Reconhecimento Facial: Garante a identidade do técnico responsável pelo teste usando a Face-API.js, aumentando a segurança e a rastreabilidade.




Monitoramento em Tempo Real: Acompanha parâmetros críticos como temperatura e CO₂ durante a incubação através da comunicação MQTT com o hardware.



Validação Automática de Resultados: O sistema compara os resultados dos testes com faixas pré-definidas para cada antibiótico, sinalizando possíveis falhas.



Geração e Impressão de QR Code: Ao final de cada teste, um QR Code com todos os dados relevantes é gerado e enviado automaticamente para uma impressora de etiquetas.



Histórico Completo: Todos os testes são armazenados em um banco de dados PostgreSQL para consulta e análise futura.




Suporte Multilíngue (i18n): Interface com suporte para Português e Inglês.



Mobile

Leitor de QR Code Especializado: Desenvolvido para escanear e interpretar os QR Codes gerados pelo sistema Hygeia.


Visualização Estruturada de Dados: Apresenta os resultados dos testes de forma organizada e de fácil compreensão.


Interface Multilíngue: Exibe as informações no idioma de preferência do usuário (Português/Inglês).


Hardware (IoT)

Dispensador Automatizado: Prepara as placas de cultura aplicando os discos de antibióticos de forma precisa com um motor de passo.



Monitoramento Ambiental: A incubadora controla a temperatura e os níveis de CO₂ para garantir a integridade do teste.


Controle de Armazenamento: O módulo de armazém monitora a temperatura dos antibióticos e libera os discos para o dispensador de forma controlada.


🏗️ Arquitetura e Tecnologias
O ecossistema é dividido em três camadas que se comunicam em tempo real.

Camada	Tecnologia Principal	Descrição
Aplicação Desktop	Electron, Node.js, Express, PostgreSQL, Face-API.js, MQTT.js	
Atua como o servidor central e a interface de controle (HUB) do sistema. Gerencia o fluxo dos testes, os dados e a comunicação com o hardware.



Aplicação Mobile	React Native, Expo	
Funciona como um cliente leve para a consulta de dados através da leitura de QR Codes gerados pelo Desktop.

Hardware (IoT)	ESP32, Arduino Framework, Sensores (LM35, MQ135, Ultrassônico), Atuadores (Motor de Passo, Servo)	
Executam as tarefas físicas no laboratório e reportam seu status e dados de sensores via MQTT.




Exportar para as Planilhas
Fluxo de Funcionamento
O técnico faz login na Aplicação Desktop e inicia um novo teste.

O sistema solicita a seleção do funcionário responsável e realiza o 

reconhecimento facial para validação.


O Desktop envia um comando de início via MQTT para o 

Dispensador.


O 

Dispensador verifica a posição da placa de cultura e solicita a liberação dos antibióticos ao Armazém.


Uma vez preparada, a placa é colocada na 

Incubadora, que começa a enviar dados de temperatura e CO₂ em tempo real para o Desktop.

Ao final do teste, o Desktop recebe os resultados finais, valida os dados, salva no banco de dados e 

gera um QR Code.


O QR Code é 

impresso automaticamente e pode ser colado na placa de cultura.


A qualquer momento, um usuário pode usar a 

Aplicação Mobile para escanear o QR Code e visualizar todos os detalhes do teste.

🔧 Instalação e Execução
Para configurar o ambiente completo do Hygeia, siga os passos para cada componente.

Pré-requisitos
Node.js e npm

PostgreSQL

Arduino IDE com o Core do ESP32 instalado

Um broker MQTT (como Mosquitto) rodando na rede local.

1. Backend (Servidor)
Bash

# Navegue até a pasta do servidor
cd /caminho/para/o/projeto/

# Instale as dependências
npm install

# Configure as variáveis de ambiente em um arquivo .env
# (DATABASE_URL, etc.)
cp .env.example .env

# Inicie o servidor
node server.js
2. Aplicação Desktop
Bash

# Navegue até a pasta da aplicação
cd /caminho/para/o/projeto/

# Instale as dependências
npm install

# Inicie a aplicação em modo de desenvolvimento
npm start

# Para criar um executável
npm run make
3. Aplicação Mobile
Bash

# Navegue até a pasta do app mobile
cd /caminho/para/hygeia-mobile/

# Instale as dependências
npm install

# Inicie o servidor de desenvolvimento do Expo
npx expo start
Escaneie o QR Code gerado com o aplicativo Expo Go no seu smartphone.

4. Hardware (Firmware)
Abra cada um dos arquivos .ino (dispenser.ino, incubadora.ino, armazem.ino) na Arduino IDE.

Selecione a placa ESP32 correta no menu de ferramentas.

Instale as bibliotecas necessárias listadas no início de cada arquivo (ex: LiquidCrystal_I2C, AsyncMqtt_Generic, Adafruit_SSD1306, etc.).

Atualize as credenciais de Wi-Fi e o endereço do broker MQTT nos arquivos.

Faça o upload do firmware para cada dispositivo ESP32.

📄 Licença
Este projeto é distribuído sob a Licença MIT. Veja o arquivo LICENSE para mais detalhes.
