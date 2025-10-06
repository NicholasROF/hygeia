// Classe principal da aplicação Hygeia
// Gerencia autenticação, navegação, Face API e conexão MQTT
class HygeiaApp {
    constructor() {
        // Estado da navegação SPA
        this.currentRoute = '';
        
        // Estado da autenticação
        this.isAuthenticated = false;
        this.user = null;
        
        // Estado das APIs externas
        this.faceApiLoaded = false;
        this.mqttConnected = false;
        this.mqttClient = null;
        
        // Dados para reconhecimento facial
        this.labeledFaceDescriptors = null;
        
        // Sistema de internacionalização
        this.i18n = window.i18n;
        
        // Inicializa a aplicação
        this.init();
    }

    /**
     * Inicializa a aplicação
     * Verifica autenticação e carrega recursos necessários
     */
    async init() {
        // Carrega traduções do sistema de internacionalização
        await this.i18n.loadTranslations();
        
        // Verifica se usuário está autenticado via localStorage
        const userId = localStorage.getItem('loggedInUserId');
        if (userId) {
            this.isAuthenticated = true;
            await this.loadApp();
        } else {
            // Redireciona para login se não autenticado
            window.location.href = 'login/login.html';
        }
    }

    /**
     * Carrega a aplicação principal com tela de loading
     * Inicializa todos os recursos necessários em sequência
     */
    async loadApp() {
        try {
            // Carrega dados do usuário logado
            await this.loadUserData();
            
            // Exibe tela de carregamento com progresso
            this.showLoadingScreen();
            this.updateLoadingProgress(20, 'step-user', this.i18n.t('loadingUserData'));
            
            // Carrega Face API para reconhecimento facial
            this.updateLoadingProgress(40, 'step-faceapi', this.i18n.t('loadingFaceAPI'));
            await this.loadFaceApi();
            this.updateLoadingProgress(70, 'step-faceapi', this.i18n.t('faceAPILoaded'));
            
            // Conecta ao broker MQTT para comunicação IoT
            this.updateLoadingProgress(80, 'step-mqtt', this.i18n.t('connectingMQTT'));
            await this.connectMqtt();
            this.updateLoadingProgress(100, 'step-mqtt', this.i18n.t('mqttConnected'));
            
            // Aguarda antes de navegar para home
            await new Promise(resolve => setTimeout(resolve, 800));
            
            this.navigate('home');
            
        } catch (error) {
            console.error('Erro ao carregar aplicação:', error);
            this.showError('Erro ao carregar aplicação. Tente novamente.');
        }
    }

    /**
     * Carrega dados do usuário logado do servidor
     */
    async loadUserData() {
        try {
            const response = await fetch(`${API_BASE}/home`);
            const usuarios = await response.json();
            if (usuarios && usuarios.length > 0) {
                this.user = usuarios[0];
            }
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }

    /**
     * Carrega modelos da Face API para reconhecimento facial
     */
    async loadFaceApi() {
        const modelsPath = `${API_BASE}/inicio/models/`;
        try {
            // Carrega modelos necessários em paralelo
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelsPath),    // Detector leve
                faceapi.nets.faceLandmark68Net.loadFromUri(modelsPath),   // Pontos faciais
                faceapi.nets.faceRecognitionNet.loadFromUri(modelsPath),  // Reconhecimento
                faceapi.nets.ssdMobilenetv1.loadFromUri(modelsPath)       // Detector SSD
            ]);
            
            // Carrega descritores faciais dos funcionários
            this.labeledFaceDescriptors = await this.getLabeledFaceDescriptors();
            
            this.faceApiLoaded = true;
            console.log('Face-API carregada com sucesso');
        } catch (error) {
            console.error('Erro ao carregar Face-API:', error);
            throw error;
        }
    }

    /**
     * Carrega descritores faciais dos funcionários cadastrados
     * @returns {Promise<Array>} Array de descritores faciais rotulados
     */
    async getLabeledFaceDescriptors() {
        try {
            // Busca funcionários do servidor
            const response = await fetch(`${API_BASE}/funcionarios`);
            const employees = await response.json();
            
            // Processa apenas funcionários com foto
            return Promise.all(
                employees.filter(employee => employee.foto).map(async employee => {
                    const descriptions = [];
                    try {
                        // Constrói URL completa da foto
                        const imgUrl = `${API_BASE}${employee.foto}`;
                        const img = await faceapi.fetchImage(imgUrl);
                        
                        // Detecta face e extrai descritor
                        const detections = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
                        if (detections) {
                            descriptions.push(detections.descriptor);
                            return new faceapi.LabeledFaceDescriptors(employee.nome, descriptions);
                        }
                    } catch (e) {
                        console.error(`Erro ao processar imagem do funcionário ${employee.nome}:`, e);
                    }
                    return null;
                })
            ).then(results => results.filter(r => r !== null)); // Remove nulos
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
            return [];
        }
    }

    /**
     * Conecta ao broker MQTT para comunicação IoT
     * @returns {Promise} Promise que resolve quando conectado
     */
    connectMqtt() {
        return new Promise((resolve, reject) => {
            // Conecta ao broker MQTT via WebSocket
            this.mqttClient = mqtt.connect('ws://192.168.133.69:8883', {
            //this.mqttClient = mqtt.connect('ws://localhost:8883', { // Alternativa local
                protocolVersion: 4,
                username: 'nba',
                password: 'nelena&ester'
            });

            // Handler para conexão bem-sucedida
            this.mqttClient.on('connect', () => {
                console.log('Conectado ao broker MQTT');
                
                // Tópicos do sistema Hygeia
                const topics = [
                    'HYGEIA/CURRENT/SETUP',  // Configuração do teste
                    'HYGEIA/CURRENT/LOOP',   // Loop principal
                    'HYGEIA/END',            // Fim do teste
                    'HYGEIA/ERROR',          // Erros
                    'HYGEIA/STORAGE'         // Armazenamento
                ];
                
                this.mqttClient.subscribe(topics, (err) => {
                    if (!err) {
                        console.log('Inscrito nos tópicos MQTT');
                        this.mqttConnected = true;
                        resolve();
                    } else {
                        reject(err);
                    }
                });
            });

            // Handler para erros
            this.mqttClient.on('error', (error) => {
                console.error('Erro MQTT:', error);
                reject(error);
            });

            // Timeout de 10 segundos
            setTimeout(() => {
                if (!this.mqttConnected) {
                    reject(new Error('Timeout na conexão MQTT'));
                }
            }, 10000);
        });
    }

    /**
     * Realiza login do usuário no sistema
     * @param {string} email - Email do usuário
     * @param {string} senha - Senha do usuário
     * @returns {Object} Resultado do login
     */
    async login(email, senha) {
        try {
            // Envia credenciais para o servidor
            const response = await fetch(`${API_BASE}/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, senha })
            });
            
            const data = await response.json();

            if (response.ok) {
                // Login bem-sucedido - armazena dados
                localStorage.setItem('loggedInUserId', data.usuario.id);
                this.isAuthenticated = true;
                this.user = data.usuario;
                window.location.href = 'spa.html';
                return { success: true };
            } else {
                return { success: false, message: this.i18n.t('invalidCredentials') };
            }
        } catch (error) {
            console.error('Erro no login:', error);
            return { success: false, message: this.i18n.t('connectionError') };
        }
    }
    
    /**
     * Realiza logout do usuário
     * Limpa dados locais e desconecta recursos
     */
    logout() {
        // Remove dados do localStorage
        localStorage.removeItem('loggedInUserId');
        localStorage.removeItem('activeTestState');
        
        // Reseta estado da aplicação
        this.isAuthenticated = false;
        this.user = null;
        
        // Desconecta MQTT se conectado
        if (this.mqttClient) {
            this.mqttClient.end();
        }
        
        // Redireciona para login
        window.location.href = 'login/login.html';
    }
    
    /**
     * Navega para uma rota específica
     * @param {string} route - Nome da rota
     */
    navigate(route) {
        this.currentRoute = route;
        this.render();
    }
    
    /**
     * Renderiza a interface baseada na rota atual
     */
    render() {
        const app = document.getElementById('app');
        
        // Renderiza template baseado na rota
        switch (this.currentRoute) {
            case 'loading':
                app.innerHTML = this.getLoadingTemplate();
                break;
            case 'home':
                app.innerHTML = this.getHomeTemplate();
                this.bindHomeEvents();
                break;
            case 'workers':
                app.innerHTML = this.getWorkersTemplate();
                this.bindWorkersEvents();
                break;
            case 'history':
                app.innerHTML = this.getHistoryTemplate();
                this.bindHistoryEvents();
                break;
            default:
                // Rota desconhecida - redireciona
                if (this.isAuthenticated) {
                    this.navigate('home');
                } else {
                    this.logout();
                }
        }
        
        // Aplica traduções após renderização
        setTimeout(() => this.applyTranslations(), 10);
    }
    
    /**
     * Aplica traduções aos elementos da interface
     */
    applyTranslations() {
        // Busca elementos com atributo de tradução
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-key');
            const attr = element.getAttribute('data-i18n-attr') || 'innerText';
            
            // Aplica tradução no atributo especificado
            if (attr === 'innerText') {
                element.innerText = this.i18n.t(key);
            } else {
                element.setAttribute(attr, this.i18n.t(key));
            }
        });
    }

    /**
     * Exibe tela de carregamento
     */
    showLoadingScreen() {
        this.currentRoute = 'loading';
        this.render();
    }

    /**
     * Atualiza progresso da tela de carregamento
     * @param {number} percentage - Porcentagem do progresso
     * @param {string} stepId - ID do passo atual
     * @param {string} message - Mensagem a exibir
     */
    updateLoadingProgress(percentage, stepId, message) {
        // Atualiza barra de progresso
        const progressFill = document.getElementById('progress-fill');
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        // Atualiza texto do passo
        const stepElement = document.getElementById(stepId);
        if (stepElement) {
            stepElement.textContent = message;
            stepElement.classList.add('completed');
        }
    }

    /**
     * Exibe tela de erro
     * @param {string} message - Mensagem de erro
     */
    showError(message) {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="error-screen">
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <h2>Ops! Algo deu errado</h2>
                    <p class="error-message">${message}</p>
                    <button class="action-button error-retry-btn" onclick="location.reload()">Tentar Novamente</button>
                </div>
            </div>
        `;
    }

    /**
     * Template da tela de carregamento
     * @returns {string} HTML da tela de loading
     */
    getLoadingTemplate() {
        const t = this.i18n.t.bind(this.i18n); // Atalho para tradução
        return `
            <div class="loading-screen">
                <div class="loading-container">
                    <div class="logo-hygeia">HYGEIA</div>
                    <div class="welcome-message">${t('welcomeUser')} ${this.user ? this.user.nome : ''}</div>
                    <div class="loading-message">${t('loadingApp')}</div>
                    <div class="loading-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" id="progress-fill"></div>
                        </div>
                        <div class="loading-steps">
                            <div class="step" id="step-user">${t('loadingUserData')}</div>
                            <div class="step" id="step-faceapi">${t('loadingFaceAPI')}</div>
                            <div class="step" id="step-mqtt">${t('connectingMQTT')}</div>
                        </div>
                    </div>
                    <div class="spinner"></div>
                </div>
            </div>
        `;
    }
    
    /**
     * Template do cabeçalho da aplicação
     * @returns {string} HTML do header
     */
    getHeaderTemplate() {
        const t = this.i18n.t.bind(this.i18n);
        return `
            <header>
                <a href="#" onclick="app.navigate('workers')" class="header-button">${t('headerManageEmployees')}</a>
                <a href="#" onclick="app.navigate('home')" class="header-button">${t('headerCurrentTest')}</a>
                <a href="#" onclick="app.navigate('history')" class="header-button">${t('headerHistory')}</a>
                <button onclick="app.logout()" class="header-button">${t('headerExit')}</button>
            </header>
        `;
    }

    /**
     * Template da tela principal (home)
     * @returns {string} HTML da tela home
     */
    getHomeTemplate() {
        const t = this.i18n.t.bind(this.i18n);
        return `
            ${this.getHeaderTemplate()}
            <div class="container">
                <h1 data-i18n-key="currentTestTitle">${t('currentTestTitle')}</h1>
                
                <div id="currentTestInfo">
                    <div id="noTestContainer">
                         <p id="noTestMessage" data-i18n-key="waitingForTest">${t('waitingForTest')}</p>
                         <button id="startNewTestButton" class="action-button" data-i18n-key="startNewTest">${t('startNewTest')}</button>
                    </div>

                    <div id="testDetails" style="display: none;">
                        <p><strong>${t('batch')}:</strong> <span id="test-lote">--</span></p>
                        <p><strong>${t('bacteria')}:</strong> <span id="test-bacteria">--</span></p>
                        <p><strong>${t('testStartDateTime')}:</strong> <span id="test-data">--</span></p>
                        <p><strong>${t('responsibleEmployee')}:</strong> <span id="test-funcionario">--</span></p>
                        <p><strong>${t('duration')}:</strong> <span id="test-duracao">--</span></p>
                        <p><strong>${t('testedAntibiotics')}:</strong></p>
                        <ul id="test-antibioticos"><li>--</li></ul>
                        <hr style="margin: 15px 0;">
                        <p><strong>${t('temperature')}:</strong> <span id="test-temperatura">--</span> °C</p>
                        <p><strong>${t('co2')}:</strong> <span id="test-co">--</span> ppm</p>
                    </div>
                </div>

                <div id="tempoRestante" class="info-card" style="display: none;">
                    <h3 data-i18n-key="remainingTime">${t('remainingTime')}</h3>
                    <p id="countdownDisplay">--:--:--</p>
                </div>

                <div class="button-group" id="abortar-button-container" style="display: none;">
                    <button id="abortarTesteButton" class="action-button abort-button" data-i18n-key="abortTest">${t('abortTest')}</button>
                </div>
            </div>

            <div id="employeeSelectionModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <h2 data-i18n-key="confirmTestResponsible">${t('confirmTestResponsible')}</h2>
                    <div id="step1-selection">
                        <div id="employeeSelectorForm">
                            <label for="employeeSelect" data-i18n-key="selectEmployee">${t('selectEmployee')}</label>
                            <select id="employeeSelect" required>
                                <option value="" data-i18n-key="loadingEmployees">${t('loadingEmployees')}</option>
                            </select>
                        </div>
                        <div class="button-group" style="margin-top: 20px;">
                            <button id="confirmEmployeeButton" data-i18n-key="confirmAndActivateCamera">${t('confirmAndActivateCamera')}</button>
                            <button id="cancelSelectionButtonStep1" style="margin-top: 10px;" data-i18n-key="cancel">${t('cancel')}</button>
                        </div>
                    </div>
                    <div id="step2-recognition" style="display: none;">
                        <h3>${t('facialRecognition')}</h3>
                        <p id="recognitionStatus">${t('waitingCamera')}</p>
                        <div class="webcam-display" style="height: 240px; margin: 10px auto; background-color: #333;">
                            <video id="webcamVideo" width="320" height="240" autoplay muted></video>
                        </div>
                        <button id="cancelRecognitionButton">${t('cancelRecognition')}</button>
                    </div>
                </div>
            </div>

            <div id="testConfirmationModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <span id="closeConfirmationModal" class="close-button">&times;</span>
                    <h2>${t('reviewAndConfirmResults')}</h2>
                    <div id="confirmationDetails">
                        <p><strong>${t('bacteria')}:</strong> <span id="confirm-bacteria"></span></p>
                        <p><strong>${t('testStartDateTime')}:</strong> <span id="confirm-data"></span></p>
                        <p><strong>${t('batch')}:</strong> <span id="confirm-lote"></span></p>
                        <p><strong>${t('responsibleEmployee')}:</strong> <span id="confirm-funcionario"></span></p>
                        <p><strong>${t('duration')}:</strong> <span id="confirm-duracao"></span></p>
                        <p><strong>${t('success')}:</strong> <span id="confirm-status"></span></p>
                        <p id="confirm-motivo-container" style="display: none;"><strong>${t('errorReason')}:</strong> <span id="confirm-motivo"></span></p>
                        <p><strong>${t('maxTemperature')}:</strong> <span id="confirm-temp-max"></span> °C</p>
                        <p><strong>${t('minTemperature')}:</strong> <span id="confirm-temp-min"></span> °C</p>
                        <p><strong>${t('maxCO2')}:</strong> <span id="confirm-co2-max"></span> ppm</p>
                        <p><strong>${t('minCO2')}:</strong> <span id="confirm-co2-min"></span> ppm</p>
                        <h3>${t('testedAntibiotics')}:</h3>
                        <ul id="confirm-antibioticos-list" style="margin-left: 20px;"></ul>
                        <p id="confirm-no-antibioticos" style="display: none;">${t('noneSpecified')}</p>
                        <h3 id="confirm-images-title" style="display:none;">${t('plateImages')}:</h3>
                        <div id="confirm-images-container" class="image-container">
                            <img id="confirm-image1" style="display:none;" alt="Imagem 1">
                            <img id="confirm-image2" style="display:none;" alt="Imagem 2">
                        </div>
                    </div>
                    <div id="rejection-reason-container" style="display: none; margin-top: 20px;">
                        <label for="userRejectionReason"><strong>${t('rejectionReason')}</strong></label>
                        <textarea id="userRejectionReason" rows="3"></textarea>
                        <button id="submitRejectionButton" class="action-button">${t('saveAsFailure')}</button>
                    </div>
                    <div id="confirmation-actions" class="button-group" style="margin-top: 25px;">
                        <button id="confirmTestButton" class="action-button confirm-btn">${t('confirmAnalysis')}</button>
                        <button id="rejectTestButton" class="action-button reject-btn">${t('rejectAnalysis')}</button>
                    </div>
                </div>
            </div>
        </div>
        `;
    }
    
    /**
     * Template da tela de funcionários
     * @returns {string} HTML da tela de workers
     */
    getWorkersTemplate() {
        const t = this.i18n.t.bind(this.i18n);
        return `
            ${this.getHeaderTemplate()}
            <div class="container">
                <h1>${t('employeeControlTitle')}</h1>
                <form id="addEmployeeForm">
                    <h2>${t('addNewEmployee')}</h2>
                    <div>
                        <div>
                            <label for="employeeName">${t('fullName')}</label>
                            <input type="text" id="employeeName" name="nome" required>
                        </div>
                        <div>
                            <label for="employeeRegistro">${t('registration')}</label>
                            <input type="text" id="employeeRegistro" name="registro" required>
                        </div>
                        <div class="webcam-section">
                            <label>${t('employeePhoto')}</label>
                            <button type="button" id="startWebcamButton" class="action-button">${t('startWebcam')}</button>
                            <div class="webcam-display">
                                <video id="webcamVideo" autoplay playsinline style="display:none;"></video>
                                <canvas id="photoCanvas" style="display:none;"></canvas>
                            </div>
                            <button type="button" id="takePhotoButton" class="action-button" style="display:none;">${t('takePhoto')}</button>
                            <img id="photoPreview" src="" alt="Photo preview" style="display:none;">
                            <input type="hidden" id="employeePhotoPath" name="foto">
                        </div>
                        <input type="hidden" id="loggedInUserId" name="usuario_id">
                    </div>
                    <button type="submit">${t('addEmployee')}</button>
                </form>
                <div>
                    <h2>${t('employeeList')}</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>${t('tableId')}</th>
                                <th>${t('tableName')}</th>
                                <th>${t('tableRegistration')}</th>
                                <th>${t('tablePhoto')}</th>
                                <th>${t('tableActions')}</th>
                            </tr>
                        </thead>
                        <tbody id="employeesTableBody"></tbody>
                    </table>
                    <p id="noEmployeesMessage">${t('noEmployeesFound')}</p>
                </div>
            </div>
        `;
    }

    /**
     * Template da tela de histórico
     * @returns {string} HTML da tela de history
     */
    getHistoryTemplate() {
        const t = this.i18n.t.bind(this.i18n);
        return `
            ${this.getHeaderTemplate()}
            <div class="container">
                <h1>${t('testHistoryTitle')}</h1>
                <div>
                    <h2>${t('testBatchList')}</h2>
                    <ul id="testList"></ul>
                    <p id="noTestsMessage" style="display: none;">${t('noTestsFound')}</p>
                </div>
            </div>
            <div id="testDetailsModal" class="modal">
                <div class="modal-content">
                    <span id="closeModalButton" class="close-button">&times;</span>
                    <h2>${t('testDetails')}</h2>
                    <div id="modalContent">
                        <p><strong>${t('bacteria')}:</strong> <span id="detailBacteria"></span></p>
                        <p><strong>${t('testStartDateTime')}:</strong> <span id="detailData"></span></p>
                        <p><strong>${t('batch')}:</strong> <span id="detailLote"></span></p>
                        <p><strong>${t('responsibleEmployee')}:</strong> <span id="detailFuncionarioNome"></span></p>
                        <p><strong>${t('duration')}:</strong> <span id="detailDuracao"></span></p>
                        <p><strong>${t('success')}:</strong> <span id="detailSucesso"></span></p>
                        <p id="detailMotivoErroContainer" style="display: none;"><strong>${t('errorReason')}:</strong> <span id="detailMotivoErro"></span></p>
                        <p><strong>${t('maxTemperature')}:</strong> <span id="detailTempMax"></span> °C</p>
                        <p><strong>${t('minTemperature')}:</strong> <span id="detailTempMin"></span> °C</p>
                        <p><strong>${t('maxCO2')}:</strong> <span id="detailCoMax"></span> ppm</p>
                        <p><strong>${t('minCO2')}:</strong> <span id="detailCoMin"></span> ppm</p>
                        <h3>${t('testedAntibiotics')}:</h3>
                        <ul id="detailAntibioticosList"></ul>
                        <h3 id="imagesTitle" style="display:none;">${t('plateImages')}:</h3>
                        <div id="detailImagesContainer" class="image-container">
                            <img id="detailImage1" style="display:none;" alt="Imagem 1">
                            <img id="detailImage2" style="display:none;" alt="Imagem 2">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Vincula eventos da tela de login
     */
    bindLoginEvents() {
        const form = document.getElementById('login-form');
        const messageEl = document.getElementById('login-mensagem');
        
        // Handler do formulário de login
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            
            const email = document.getElementById('email-login').value;
            const senha = document.getElementById('senha-login').value;
            
            const result = await this.login(email, senha);
            
            // Exibe mensagem de erro se login falhar
            if (!result.success) {
                messageEl.textContent = result.message;
                messageEl.style.display = 'block';
                messageEl.style.color = 'red';
            }
        });
    }

    /**
     * Vincula eventos da tela principal
     */
    bindHomeEvents() {
        // Inicializa o gerenciador de testes
        this.testManager = new TestManager(this);
        this.testManager.bindEvents();
    }

    /**
     * Vincula eventos da tela de funcionários
     */
    bindWorkersEvents() {
        // Elementos do formulário de adicionar funcionário
        const addEmployeeForm = document.getElementById('addEmployeeForm');
        const startWebcamButton = document.getElementById('startWebcamButton');
        const takePhotoButton = document.getElementById('takePhotoButton');
        const webcamVideo = document.getElementById('webcamVideo');
        const photoCanvas = document.getElementById('photoCanvas');
        const photoPreview = document.getElementById('photoPreview');
        const employeePhotoPathInput = document.getElementById('employeePhotoPath');
        const loggedInUserIdInput = document.getElementById('loggedInUserId');
        
        let mediaStream = null; // Stream da webcam
        
        // Define ID do usuário logado
        if (loggedInUserIdInput) {
            loggedInUserIdInput.value = localStorage.getItem('loggedInUserId');
        }
        
        // Botão para iniciar webcam
        if (startWebcamButton) {
            startWebcamButton.addEventListener('click', async () => {
                try {
                    // Solicita acesso à câmera
                    mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
                    webcamVideo.srcObject = mediaStream;
                    webcamVideo.style.display = 'block';
                    takePhotoButton.style.display = 'block';
                    startWebcamButton.style.display = 'none';
                } catch (err) {
                    alert('Erro ao acessar webcam');
                }
            });
        }
        
        // Botão para capturar foto
        if (takePhotoButton) {
            takePhotoButton.addEventListener('click', () => {
                // Captura frame do vídeo no canvas
                const context = photoCanvas.getContext('2d');
                photoCanvas.width = webcamVideo.videoWidth;
                photoCanvas.height = webcamVideo.videoHeight;
                context.drawImage(webcamVideo, 0, 0, photoCanvas.width, photoCanvas.height);
                
                // Converte para data URL e exibe preview
                const imageDataURL = photoCanvas.toDataURL('image/png');
                photoPreview.src = imageDataURL;
                photoPreview.style.display = 'block';
                webcamVideo.style.display = 'none';
                takePhotoButton.style.display = 'none';

                document.querySelector('.webcam-display').style.display = 'none';
                
                // Para o stream da webcam
                if (mediaStream) {
                    mediaStream.getTracks().forEach(track => track.stop());
                }

                // Gera nome do arquivo baseado no nome do funcionário
                const employeeName = document.getElementById('employeeName').value || 'funcionario';
                const fileName = `${employeeName.replace(/\s+/g, '_')}_${Date.now()}.png`;
                
                // Converte canvas para blob e faz upload
                photoCanvas.toBlob(async (blob) => {
                    const formData = new FormData();
                    // Nome deve corresponder ao esperado pelo servidor
                    formData.append('photo', blob, 'funcionario.jpg');

                    try {
                        // Faz upload da imagem
                        const response = await fetch(`${API_BASE}/upload-employee-photo`, {
                            method: 'POST',
                            body: formData
                        });

                        if (!response.ok) {
                            throw new Error('Falha no upload da imagem.');
                        }

                        const result = await response.json();

                        // Armazena URL da foto para uso no cadastro
                        employeePhotoPathInput.value = result.filePath; 
                        console.log('URL da foto recebida do servidor:', result.filePath);
                        alert('Foto enviada com sucesso! Agora você pode adicionar o funcionário.');

                    } catch (error) {
                        console.error('Erro ao enviar foto:', error);
                        alert('Ocorreu um erro ao enviar a foto. Tente novamente.');
                    }

                }, 'image/jpeg');
            });
        }
        
        // Handler do formulário de adicionar funcionário
        if (addEmployeeForm) {
            addEmployeeForm.addEventListener('submit', async (event) => {
                event.preventDefault();
                
                // Coleta dados do formulário
                const formData = new FormData(addEmployeeForm);
                const employeeData = Object.fromEntries(formData.entries());
                
                try {
                    // Envia dados para o servidor
                    const response = await fetch(`${API_BASE}/funcionarios`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(employeeData)
                    });
                    
                    if (response.ok) {
                        // Limpa formulário e atualiza lista
                        addEmployeeForm.reset();
                        photoPreview.style.display = 'none';
                        startWebcamButton.style.display = 'block';
                        this.fetchEmployees();
                    }
                } catch (error) {
                    alert('Erro ao adicionar funcionário');
                }
            });
        }
        
        // Carrega lista inicial de funcionários
        this.fetchEmployees();
    }

    /**
     * Vincula eventos da tela de histórico
     */
    bindHistoryEvents() {
        const testDetailsModal = document.getElementById('testDetailsModal');
        const closeModalButton = document.getElementById('closeModalButton');
        
        // Botão fechar modal
        if (closeModalButton) {
            closeModalButton.addEventListener('click', () => {
                testDetailsModal.style.display = 'none';
            });
        }
        
        // Fecha modal ao clicar fora
        window.addEventListener('click', (event) => {
            if (event.target === testDetailsModal) {
                testDetailsModal.style.display = 'none';
            }
        });
        
        // Carrega lista inicial de testes
        this.fetchTestes();
    }

    // Busca a lista de funcionários da API
    async fetchEmployees() {
        try {
            const response = await fetch(`${API_BASE}/funcionarios`, {cache: 'no-cache'});
            const employees = await response.json();
            this.renderEmployees(employees);
        } catch (error) {
            console.error('Erro ao buscar funcionários:', error);
        }
    }

    // Remove um funcionário após confirmação do usuário
    async deleteEmployee(id) {
        if (confirm(this.i18n.t('confirmEmployeeRemoval'))) {
            try {
                await fetch(`${API_BASE}/funcionarios/${id}`, { method: 'DELETE' });
                this.fetchEmployees(); // Atualiza a lista após remoção
            } catch (error) {
                alert('Error removing employee');
            }
        }
    }
    
    // Renderiza a tabela de funcionários na interface
    renderEmployees(employees) {
        const tbody = document.getElementById('employeesTableBody');
        const noMessage = document.getElementById('noEmployeesMessage');
        const t = this.i18n.t.bind(this.i18n);
        
        if (!tbody) return;
        tbody.innerHTML = ''; // Limpa a tabela antes de renderizar
        
        // Exibe mensagem se não há funcionários
        if (employees.length === 0) {
            if (noMessage) noMessage.style.display = 'block';
        } else {
            if (noMessage) noMessage.style.display = 'none';
            // Cria uma linha para cada funcionário
            employees.forEach(employee => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${employee.id}</td>
                    <td>${employee.nome}</td>
                    <td>${employee.registro}</td>
                    <td>${employee.foto ? `<img class="table-photo" src="${API_BASE}${employee.foto}" alt="Foto">` : t('tablePhoto')}</td>
                    <td><button onclick="app.deleteEmployee(${employee.id})">${t('remove')}</button></td>
                `;
            });
        }
    }

    

    // Busca a lista de testes da API
    async fetchTestes() {
        try {
            const response = await fetch(`${API_BASE}/testes`);
            const testes = await response.json();
            this.renderTestes(testes);
        } catch (error) {
            console.error('Erro ao buscar testes:', error);
        }
    }

    // Renderiza a lista de testes na interface
    renderTestes(testes) {
        const testList = document.getElementById('testList');
        const noMessage = document.getElementById('noTestsMessage');
        
        if (!testList) return;
        
        testList.innerHTML = ''; // Limpa a lista antes de renderizar
        
        // Exibe mensagem se não há testes
        if (testes.length === 0) {
            if (noMessage) noMessage.style.display = 'block';
        } else {
            if (noMessage) noMessage.style.display = 'none';
            // Cria um item para cada teste
            testes.forEach(teste => {
                const li = document.createElement('li');
                li.className = 'test-item';
                // Ajusta o fuso horário da data (UTC-3)
                const dataAppLista = new Date(teste.data);
                dataAppLista.setHours(dataAppLista.getHours() - 3);
                li.innerHTML = `
                    <span>Lote: ${teste.lote}</span>
                    <span>${dataAppLista.toLocaleString('pt-BR')}</span>
                `;
                // Adiciona evento de clique para mostrar detalhes
                li.addEventListener('click', () => this.showTestDetails(teste.id));
                testList.appendChild(li);
            });
        }
    }

    // Exibe os detalhes completos de um teste específico no modal
    async showTestDetails(testId) {
    try {
        // Busca os dados detalhados do teste
        const response = await fetch(`${API_BASE}/testes/${testId}`);
        if (!response.ok) {
            throw new Error(`Erro na requisição: ${response.statusText}`);
        }
        const test = await response.json();

        // Função auxiliar para definir texto em elementos do DOM
        const setText = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value ?? '--';
        };

        // Preenche os campos básicos do teste
        setText('detailBacteria', test.bacteria);
        const dataApp = new Date(test.data);
        dataApp.setHours(dataApp.getHours() - 3); // Ajuste de fuso horário
        setText('detailData', dataApp.toLocaleString('pt-BR'));
        setText('detailLote', test.lote);
        setText('detailFuncionarioNome', test.funcionario_responsavel_nome);
        setText('detailDuracao', this.formatTestDuration(test.duracao));
        setText('detailSucesso', test.sucesso ? 'Sim' : 'Não');

        // Preenche dados de temperatura e CO com formatação numérica
        // Converte para número antes de aplicar formatação decimal
        setText('detailTempMax', parseFloat(test.temperatura_max)?.toFixed(2));
        setText('detailTempMin', parseFloat(test.temperatura_min)?.toFixed(2));
        setText('detailCoMax', parseFloat(test.co_max)?.toFixed(2));
        setText('detailCoMin', parseFloat(test.co_min)?.toFixed(2));

        // Exibe motivo do erro apenas se o teste falhou
        const motivoErroContainer = document.getElementById('detailMotivoErroContainer');
        if (!test.sucesso && test.motivo_erro) {
            setText('detailMotivoErro', test.motivo_erro);
            if (motivoErroContainer) motivoErroContainer.style.display = 'block';
        } else {
            if (motivoErroContainer) motivoErroContainer.style.display = 'none';
        }
        
        // Renderiza a lista de antibióticos testados
        const antibioticosList = document.getElementById('detailAntibioticosList');
        const noAntibioticosMessage = document.getElementById('noAntibioticosMessage');
        if (antibioticosList) {
            antibioticosList.innerHTML = '';
            if (test.antibioticos_testados && test.antibioticos_testados.length > 0) {
                if (noAntibioticosMessage) noAntibioticosMessage.style.display = 'none';
                test.antibioticos_testados.forEach(ab => {
                    const li = document.createElement('li');
                    li.textContent = `${ab.nome} - Halo: ${ab.diametro_halo} mm`;
                    antibioticosList.appendChild(li);
                });
            } else {
                if (noAntibioticosMessage) noAntibioticosMessage.style.display = 'block';
            }
        }

        // Gerencia a exibição das imagens do teste
        const imagesTitle = document.getElementById('imagesTitle');
        const imagesContainer = document.getElementById('detailImagesContainer');
        const img1 = document.getElementById('detailImage1');
        const img2 = document.getElementById('detailImage2');

        let hasImages = false;
        // Configura primeira imagem se disponível
        if (img1 && test.imagem1_url) {
            img1.src = test.imagem1_url;
            img1.style.display = 'block';
            hasImages = true;
        } else if (img1) {
            img1.style.display = 'none';
        }

        // Configura segunda imagem se disponível
        if (img2 && test.imagem2_url) {
            img2.src = test.imagem2_url;
            img2.style.display = 'block';
            hasImages = true;
        } else if (img2) {
            img2.style.display = 'none';
        }

        // Exibe ou oculta o container de imagens baseado na disponibilidade
        if (imagesContainer) imagesContainer.style.display = hasImages ? 'flex' : 'none';
        if (imagesTitle) imagesTitle.style.display = hasImages ? 'block' : 'none';

        // Exibe o modal com os detalhes
        document.getElementById('testDetailsModal').style.display = 'flex';
    } catch (error) {
        console.error('Erro ao carregar detalhes do teste:', error);
        alert('Erro ao carregar detalhes do teste. Verifique o console para mais informações.');
    }
}

    // Formata a duração do teste em formato legível (horas, minutos, segundos)
    formatTestDuration(totalSeconds) {
        // Valida se o valor é válido
        if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds) || totalSeconds === 0) {
            return '--';
        }
        const secondsNum = Math.round(parseFloat(totalSeconds));
        if (secondsNum <= 0) return '--';
        
        // Calcula horas, minutos e segundos
        const hours = Math.floor(secondsNum / 3600);
        const minutes = Math.floor((secondsNum % 3600) / 60);
        const seconds = secondsNum % 60;

        const result = [];
        const t = this.i18n.t.bind(this.i18n);

        // Adiciona cada unidade de tempo se for maior que zero
        if (hours > 0) {
            result.push(`${hours} ${t(hours === 1 ? 'hour' : 'hours')}`);
        }
        if (minutes > 0) {
            result.push(`${minutes} ${t(minutes === 1 ? 'minute' : 'minutes')}`);
        }
        if (seconds > 0) {
            result.push(`${seconds} ${t(seconds === 1 ? 'second' : 'seconds')}`);
        }

        // Junta as partes com conectores apropriados
        return result.length > 0 ? result.join(t('andConnector')) : '--';
    }
}

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async () => {
    // A instância do i18n é criada e disponibilizada globalmente no i18n.js
    // A classe HygeiaApp irá pegá-la de window.i18n
    window.app = new HygeiaApp();
});

// Carrega os modelos necessários para reconhecimento facial
async function loadFaceApiModels() {
    try {
        // Carrega todos os modelos em paralelo para melhor performance
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(`${API_BASE}/inicio/models`), // Detector de faces
            faceapi.nets.faceLandmark68Net.loadFromUri(`${API_BASE}/inicio/models`), // Pontos de referência faciais
            faceapi.nets.faceRecognitionNet.loadFromUri(`${API_BASE}/inicio/models`) // Reconhecimento facial
        ]);
        console.log("✅ Modelos da Face API carregados");
        return true;
    } catch (err) {
        console.error("❌ Erro ao carregar modelos da Face API:", err);
        return false;
    }
}