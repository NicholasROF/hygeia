<div align="center">
  <img src="https://github.com/NicholasROF/hygeia/blob/main/desktop/assets/hygeia.jpeg" alt="Banner do Projeto Hygeia" width="800"/>
</div>

<h1 align="center">Projeto Hygeia</h1>

<div align="center">
  <img src="https://img.shields.io/badge/status-em%20desenvolvimento-blue" alt="Status do Projeto">
  <img src="https://img.shields.io/badge/licen%C3%A7a-MIT-green" alt="Licença MIT">
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React Native">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL">
</div>

<p align="center">
  Um ecossistema completo (IoT, Desktop e Mobile) para a automação e monitoramento de testes bacteriológicos em laboratório.
</p>

---

### 📋 **Índice**
1. [Sobre o Projeto](#-sobre-o-projeto)
2. [Funcionalidades Principais](#-funcionalidades-principais)
3. [Arquitetura e Tecnologias](#️-arquitetura-e-tecnologias)
4. [Fluxo de Funcionamento](#-fluxo-de-funcionamento)
5. [Instalação e Execução](#-instalação-e-execução)
6. [Licença](#-licença)

---

### 📜 Sobre o Projeto

O **Hygeia** é um ecossistema multiplataforma integrado (*IoT*, *Desktop* e *Mobile*) projetado para a automação, controle e monitoramento de testes bacteriológicos. A solução visa trazer mais segurança, rastreabilidade e eficiência ao processo de testes de sensibilidade a antibióticos, desde a preparação da amostra até a consulta dos resultados.

O sistema é composto por três pilares principais:
* **Hardware (IoT)**: Uma rede de dispositivos inteligentes baseados em `ESP32` que executam as tarefas físicas.
* **Aplicação Desktop**: O cérebro do sistema, desenvolvido em `Electron`, que serve como a interface central de controle.
* **Aplicação Mobile**: Um leitor de QR Code em `React Native` para a consulta rápida e portátil dos resultados.

---

### ✨ Funcionalidades Principais

#### 🖥️ **Desktop**
* **Gestão de Usuários e Funcionários**: Sistema completo de autenticação e cadastro.
* **Reconhecimento Facial**: Garante a identidade do técnico responsável usando `Face-API.js`.
* **Monitoramento em Tempo Real**: Acompanha parâmetros críticos como temperatura e CO₂ via MQTT.
* **Validação Automática de Resultados**: Compara os resultados com faixas pré-definidas para cada antibiótico.
* **Geração e Impressão de QR Code**: Ao final de cada teste, um QR Code é gerado e impresso automaticamente.
* **Histórico Completo**: Todos os testes são armazenados em um banco de dados `PostgreSQL`.
* **Suporte Multilíngue (i18n)**: Interface com suporte para Português e Inglês.

#### 📱 **Mobile**
* **Leitor de QR Code Especializado**: Desenvolvido para escanear e interpretar os QR Codes do sistema Hygeia.
* **Visualização Estruturada de Dados**: Apresenta os resultados de forma organizada e de fácil compreensão.
* **Interface Multilíngue**: Exibe as informações no idioma de preferência do usuário.

#### 🤖 **Hardware (IoT)**
* **Dispensador Automatizado**: Prepara as placas de cultura aplicando os discos de antibióticos com precisão.
* **Monitoramento Ambiental**: A incubadora controla a temperatura e os níveis de CO₂ para garantir a integridade do teste.
* **Controle de Armazenamento**: O módulo de armazém monitora a temperatura dos antibióticos e os libera de forma controlada.

---

### 🏗️ Arquitetura e Tecnologias

O ecossistema é dividido em três camadas que se comunicam em tempo real.

| Camada | Tecnologia Principal | Descrição |
| :--- | :--- | :--- |
| **Aplicação Desktop** | `Electron`, `Node.js`, `Express`, `PostgreSQL`, `Face-API.js`, `MQTT.js` | Atua como o servidor central e a interface de controle (HUB) do sistema. |
| **Aplicação Mobile** | `React Native`, `Expo` | Funciona como um cliente leve para a consulta de dados via QR Code. |
| **Hardware (IoT)** | `ESP32`, `Arduino Framework`, Sensores (`LM35`, `MQ135`), Atuadores (Motor de Passo, Servo) | Executam as tarefas físicas e reportam seu status e dados via MQTT. |

---

### 🔄 Fluxo de Funcionamento

O fluxo completo de um teste, desde o início até a consulta dos resultados.

1.  O técnico faz login na **Aplicação Desktop** e inicia um novo teste.
2.  O sistema realiza o **reconhecimento facial** para validar a identidade do responsável.
3.  O Desktop envia um comando via MQTT para o **Dispensador**.
4.  O **Dispensador** prepara a placa, solicitando os antibióticos ao **Armazém**.
5.  A placa é colocada na **Incubadora**, que envia dados em tempo real para o Desktop.
6.  Ao final, o Desktop valida os resultados e **gera um QR Code**.
7.  O QR Code é **impresso automaticamente**.
8.  O usuário escaneia o QR Code com a **Aplicação Mobile** para ver os resultados.


---

### 🔧 Instalação e Execução

<details>
<summary><strong>Clique para expandir as instruções de instalação</strong></summary>

#### Pré-requisitos
* Node.js e npm
* PostgreSQL
* Arduino IDE com o Core do ESP32 instalado
* Um broker MQTT (como Mosquitto) rodando na rede local.

#### 1. Backend (Servidor)
```bash
# Navegue até a pasta do servidor
cd /caminho/para/o/projeto/

# Instale as dependências
npm install

# Configure as variáveis de ambiente (.env)
cp .env.example .env

# Inicie o servidor
node server.js
```

#### 2. Aplicação Desktop
```bash
# Navegue até a pasta da aplicação
cd /caminho/para/o/projeto/

# Instale as dependências
npm install

# Inicie em modo de desenvolvimento
npm start

# Para criar um executável
npm run make
```

#### 3. Aplicação Mobile
```bash
# Navegue até a pasta do app mobile
cd /caminho/para/hygeia-mobile/

# Instale as dependências
npm install

# Inicie o servidor do Expo
npx expo start
```
*Escaneie o QR Code gerado com o aplicativo Expo Go no seu smartphone.*

#### 4. Hardware (Firmware)
1.  Abra cada um dos arquivos `.ino` (`dispenser.ino`, `incubadora.ino`, `armazem.ino`) na Arduino IDE.
2.  Selecione a placa ESP32 correta no menu de ferramentas.
3.  Instale as bibliotecas necessárias listadas no início de cada arquivo.
4.  Atualize as credenciais de Wi-Fi e o endereço do broker MQTT nos arquivos.
5.  Faça o upload do firmware para cada dispositivo ESP32.

</details>

---

### 📄 Licença
Este projeto é distribuído sob a Licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

---
