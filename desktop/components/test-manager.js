// Gerenciador de Testes - Controla todo o ciclo de vida dos testes bacteriológicos
// Integra reconhecimento facial, MQTT, validação de dados e interface do usuário

class TestManager {
    constructor(app) {
        this.app = app;
        this.i18n = app.i18n; // Sistema de internacionalização
        
        // Estado do teste atual
        this.currentTestState = null;
        this.countdownInterval = null;
        this.recognitionInterval = null;
        this.selectedEmployee = null;
        
        // Flags de controle
        this.isWaitingForSetup = false;
        this.waitingForEndAfterError = false;
        this.permissionDoTest = true;
        
        // Tabela de validação de diâmetros de halo para antibióticos (em mm)
        this.ANTIBIOTIC_RANGES = {
            'Amoxicilina':    { min: 5.0, max: 37.0 },
            'Azitromicina':   { min: 1.5, max: 43.5 },
            'Ciprofloxacino': { min: 7.0, max: 49.5 },
            'Cefalexina':     { min: 2.5, max: 34.5 },
            'Doxiciclina':    { min: 8.0, max: 40.0 },
            'Clindamicina':   { min: 8.0, max: 30.5 }
        };
        
        // Inicializa eventos e verifica testes ativos
        this.bindMqttEvents();
        this.checkForActiveTest();
    }

    // Configura listeners para mensagens MQTT do sistema Hygeia
    bindMqttEvents() {
        if (this.app.mqttClient) {
            this.app.mqttClient.on('message', (topic, message) => {
                let data;
                try { 
                    data = JSON.parse(message.toString()); 
                } catch (e) { 
                    console.error('Erro ao analisar JSON da mensagem MQTT:', e); 
                    return; 
                }

                // Roteamento de mensagens baseado no tópico
                if (topic === 'HYGEIA/CURRENT/SETUP' && this.isWaitingForSetup) {
                    this.handleSetupMessage(data); // Configuração inicial do teste
                } else if (topic === 'HYGEIA/CURRENT/LOOP' && (this.currentTestState || this.isWaitingForSetup) && !this.waitingForEndAfterError) {
                    this.handleLoopMessage(data); // Dados em tempo real (temperatura, CO2)
                } else if (topic === 'HYGEIA/END' && this.currentTestState) {
                    this.handleEndMessage(data); // Finalização do teste
                } else if (topic === 'HYGEIA/ERROR' && this.currentTestState) {
                    this.handleErrorMessage(data); // Erros durante o teste
                } else if (topic === 'HYGEIA/STORAGE' && !this.currentTestState) {
                    this.handleStorageMessage(data); // Status do armazenamento
                }
            });
        }
    }

    // Vincula eventos dos botões da interface de testes
    bindEvents() {
        const startNewTestButton = document.getElementById('startNewTestButton');
        const confirmEmployeeButton = document.getElementById('confirmEmployeeButton');
        const cancelSelectionButtonStep1 = document.getElementById('cancelSelectionButtonStep1');
        const cancelRecognitionButton = document.getElementById('cancelRecognitionButton');
        const abortarTesteButton = document.getElementById('abortarTesteButton');
        
        // Configura eventos do modal de confirmação
        this.bindConfirmationModalEvents();

        // Botão para iniciar novo teste
        if (startNewTestButton) {
            startNewTestButton.addEventListener('click', () => this.startNewTest());
        }
        
        // Botão para confirmar funcionário selecionado
        if (confirmEmployeeButton) {
            confirmEmployeeButton.addEventListener('click', () => this.confirmEmployee());
        }
        
        // Botões de cancelamento
        if (cancelSelectionButtonStep1) {
            cancelSelectionButtonStep1.addEventListener('click', () => this.closeModal());
        }
        
        if (cancelRecognitionButton) {
            cancelRecognitionButton.addEventListener('click', () => this.closeModal());
        }
        
        // Botão para abortar teste em andamento
        if (abortarTesteButton) {
            abortarTesteButton.addEventListener('click', () => this.abortTest());
        }
    }

    // Inicia um novo teste após validações necessárias
    async startNewTest() {
        // Verifica se o armazenamento está em condições adequadas
        if (!this.permissionDoTest) {
            alert(this.i18n.t('antibioticsStorageError'));
            return;
        }

        // Verifica se a Face API foi carregada
        if (!this.app.faceApiLoaded) {
            alert(this.i18n.t('faceAPIModelsStillLoading'));
            return;
        }
        
        // Verifica se há dados faciais dos funcionários
        if (!this.app.labeledFaceDescriptors || this.app.labeledFaceDescriptors.length === 0) {
            alert(this.i18n.t('noFaceDataLoaded'));
            return;
        }

        // Carrega lista de funcionários e exibe modal de seleção
        await this.fetchAndPopulateEmployees();
        this.showEmployeeModal();
    }

    // Busca funcionários da API e popula o select de seleção
    async fetchAndPopulateEmployees() {
        const employeeSelect = document.getElementById('employeeSelect');
        const t = this.i18n.t.bind(this.i18n);
        
        try {
            // Exibe mensagem de carregamento
            employeeSelect.innerHTML = `<option value="">${t('loadingEmployees')}</option>`;
            
            // Busca funcionários do servidor
            const response = await fetch(`${API_BASE}/funcionarios`);
            if (!response.ok) throw new Error('Falha ao buscar funcionários do servidor.');
            
            const employees = await response.json();
            
            // Limpa e adiciona opção padrão
            employeeSelect.innerHTML = `<option value="">${t('selectEmployeeOption')}</option>`;
            
            // Adiciona cada funcionário como opção
            employees.forEach(employee => {
                const option = document.createElement('option');
                option.value = employee.id;
                option.textContent = `${employee.nome} (${t('registration')}: ${employee.registro})`;
                option.dataset.name = employee.nome; // Armazena nome para reconhecimento facial
                employeeSelect.appendChild(option);
            });
        } catch (error) {
            console.error('Erro ao popular funcionários:', error);
            employeeSelect.innerHTML = `<option value="">${t('errorLoadingEmployees')}</option>`;
        }
    }

    // Exibe o modal de seleção de funcionário (primeira etapa)
    showEmployeeModal() {
        const modal = document.getElementById('employeeSelectionModal');
        const step1 = document.getElementById('step1-selection');
        const step2 = document.getElementById('step2-recognition');
        
        if (modal && step1 && step2) {
            step2.style.display = 'none'; // Oculta etapa de reconhecimento
            step1.style.display = 'block'; // Exibe etapa de seleção
            modal.style.display = 'block';
        }
    }

    // Confirma a seleção do funcionário e inicia reconhecimento facial
    confirmEmployee() {
        const employeeSelect = document.getElementById('employeeSelect');
        const selectedOption = employeeSelect.options[employeeSelect.selectedIndex];
        
        // Valida se um funcionário foi selecionado
        if (!selectedOption.value) {
            alert(this.i18n.t('selectEmployeeFromList'));
            return;
        }
        
        // Armazena dados do funcionário selecionado
        this.selectedEmployee = { 
            id: selectedOption.value, 
            name: selectedOption.dataset.name 
        };
        
        // Alterna para a etapa de reconhecimento facial
        const step1 = document.getElementById('step1-selection');
        const step2 = document.getElementById('step2-recognition');
        
        if (step1 && step2) {
            step1.style.display = 'none';
            step2.style.display = 'block';
        }
        
        // Inicia webcam e processo de reconhecimento
        this.startWebcam();
        this.startRecognition();
    }

    // Inicia a webcam para captura de vídeo
    startWebcam() {
        const webcamVideo = document.getElementById('webcamVideo');
        const recognitionStatus = document.getElementById('recognitionStatus');
        
        if (webcamVideo && recognitionStatus) {
            recognitionStatus.textContent = this.i18n.t('activatingFaceDetector');
            
            // Solicita acesso à câmera do usuário
            navigator.mediaDevices.getUserMedia({ video: {} })
                .then(stream => { 
                    webcamVideo.srcObject = stream; 
                })
                .catch(err => {
                    console.error("Erro ao aceder à câmara:", err);
                    recognitionStatus.textContent = this.i18n.t('errorAccessingCamera');
                });
        }
    }

    // Para a webcam e libera recursos
    stopWebcam() {
        const webcamVideo = document.getElementById('webcamVideo');
        if (webcamVideo && webcamVideo.srcObject) {
            // Para todas as tracks de vídeo
            webcamVideo.srcObject.getTracks().forEach(track => track.stop());
            webcamVideo.srcObject = null;
        }
    }

    startRecognition() {
        const webcamVideo = document.getElementById('webcamVideo');
        const recognitionStatus = document.getElementById('recognitionStatus');
        
        if (!this.app.labeledFaceDescriptors || !webcamVideo || !recognitionStatus) {
            if (recognitionStatus) {
                recognitionStatus.textContent = this.i18n.t('errorRecognitionDataNotLoaded');
            }
            return;
        }

        const faceMatcher = new faceapi.FaceMatcher(this.app.labeledFaceDescriptors, 0.6);
        const selectedName = this.selectedEmployee.name;

        this.recognitionInterval = setInterval(async () => {
            if (webcamVideo.paused || webcamVideo.ended) return;
            
            const detections = await faceapi.detectAllFaces(webcamVideo, new faceapi.TinyFaceDetectorOptions())
                .withFaceLandmarks()
                .withFaceDescriptors();
            
            if (detections.length > 0) {
                const bestMatch = faceMatcher.findBestMatch(detections[0].descriptor);
                recognitionStatus.textContent = `${this.i18n.t('personDetected')}: ${bestMatch.label}`;

                if (bestMatch.label === selectedName) {
                    clearInterval(this.recognitionInterval);
                    recognitionStatus.textContent = this.i18n.t('employeeConfirmed', { employeeName: selectedName });
                    this.stopWebcam();
                    
                    setTimeout(() => {
                        this.closeModal();
                        this.isWaitingForSetup = true;
                        this.publishRelease({ release: true });
                        
                        const noTestMessage = document.getElementById('noTestMessage');
                        if (noTestMessage) {
                            noTestMessage.textContent = this.i18n.t('waitingForTestFor', { employeeName: selectedName });
                        }
                    }, 1500);
                }
            } else {
                recognitionStatus.textContent = this.i18n.t('noFaceDetected');
            }
        }, 1000);
    }

    closeModal() {
        this.stopWebcam();
        if (this.recognitionInterval) {
            clearInterval(this.recognitionInterval);
        }
        
        const modal = document.getElementById('employeeSelectionModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    publishRelease(payload) {
        if (this.app.mqttClient) {
            const releaseMessage = JSON.stringify(payload);
            this.app.mqttClient.publish('HYGEIA/RELEASE', releaseMessage, (err) => {
                if (err) {
                    console.error(`Falha ao publicar mensagem de release (${releaseMessage}):`, err);
                } else {
                    console.log(`Mensagem '${releaseMessage}' publicada no tópico HYGEIA/RELEASE.`);
                }
            });
        }
    }

    publishError(errorMessage) {
        if (this.app.mqttClient) {
            const message = JSON.stringify({ error: errorMessage });
            this.app.mqttClient.publish('HYGEIA/ERROR', message, (err) => {
                if (err) {
                    console.error('Falha ao publicar mensagem de erro:', err);
                } else {
                    console.log(`Mensagem de erro '${message}' publicada.`);
                }
            });
        }
    }

    abortTest() {
        this.publishError(this.i18n.t('testAbortedByUser'));
    }

    // Métodos de manipulação de mensagens MQTT
    handleSetupMessage(data) {
        this.isWaitingForSetup = false;
        this.setActiveTestUI();
        
        const startTime = new Date();
        const loggedInUserId = localStorage.getItem('loggedInUserId');
        const duracaoSegundos = parseInt(data.tempo_teste_segundos, 10) || 0;

        this.currentTestState = {
            bacteria: data.bacteria || 'Não informado',
            data: startTime.toISOString(),
            lote: `${startTime.getFullYear()}${String(startTime.getDate()).padStart(2, '0')}${String(startTime.getMonth() + 1).padStart(2, '0')}${String(startTime.getHours()).padStart(2, '0')}${String(startTime.getMinutes()).padStart(2, '0')}${String(startTime.getSeconds()).padStart(2, '0')}`,
            funcionario_responsavel_id: this.selectedEmployee.id,
            funcionario_responsavel_nome: this.selectedEmployee.name,
            usuario_id: loggedInUserId,
            duracao: duracaoSegundos,
            antibioticos_testados: (data.antibiotico && Array.isArray(data.antibiotico)) ? data.antibiotico.map(name => ({ nome: name })) : [],
            testEndTime: Date.now() + (duracaoSegundos * 1000),
            temperatura_min: null,
            temperatura_max: null,
            co_min: null,
            co_max: null,
        };
        
        localStorage.setItem('activeTestState', JSON.stringify(this.currentTestState));
        setTimeout(() => this.updateTestUI(), 100);
        this.startCountdown(duracaoSegundos);
    }

    handleLoopMessage(data) {
        const MIN_TEMP = 20.0, MAX_TEMP = 35.0;
        const MIN_CO = 100.0, MAX_CO = 2000.0;
        
        // Se não há currentTestState mas está aguardando setup, ignora
        if (!this.currentTestState && this.isWaitingForSetup) {
            return;
        }

        if (typeof data.temperatura === 'number') {
            if (this.currentTestState.temperatura_min === null || data.temperatura < this.currentTestState.temperatura_min) {
                this.currentTestState.temperatura_min = data.temperatura;
            }
            if (this.currentTestState.temperatura_max === null || data.temperatura > this.currentTestState.temperatura_max) {
                this.currentTestState.temperatura_max = data.temperatura;
            }

            if (data.temperatura < MIN_TEMP || data.temperatura > MAX_TEMP) {
                const errorMsg = `Temperatura (${data.temperatura.toFixed(1)}°C) fora do intervalo permitido.`;
                this.publishError(errorMsg);
                this.publishRelease({ release: false });
                return;
            }
            
            const temperaturaEl = document.getElementById('test-temperatura');
            if (temperaturaEl) {
                temperaturaEl.textContent = data.temperatura.toFixed(1);
            }
        }

        if (typeof data.co === 'number') {
            if (this.currentTestState.co_min === null || data.co < this.currentTestState.co_min) {
                this.currentTestState.co_min = data.co;
            }
            if (this.currentTestState.co_max === null || data.co > this.currentTestState.co_max) {
                this.currentTestState.co_max = data.co;
            }

            if (data.co < MIN_CO || data.co > MAX_CO) {
                const errorMsg = `Nível de CO2 (${data.co}ppm) fora do intervalo permitido.`;
                this.publishError(errorMsg);
                this.publishRelease({ release: false });
                return;
            }
            
            const coEl = document.getElementById('test-co');
            if (coEl) {
                coEl.textContent = data.co;
            }
        }

        localStorage.setItem('activeTestState', JSON.stringify(this.currentTestState));
    }

    async handleEndMessage(data) {
    console.log("Recebida mensagem de fim de teste:", data);
    if (!this.currentTestState) return;

    if (this.countdownInterval) {
        clearInterval(this.countdownInterval);
    }

    const countdownDisplay = document.getElementById('countdownDisplay');
    if (countdownDisplay) countdownDisplay.textContent = this.i18n.t('pendingReview');

    // Lida com o caso em que um erro de hardware/MQTT ocorreu antes do fim
    if (this.waitingForEndAfterError) {
        this.pendingConfirmationData = {
            ...this.currentTestState,
            ...this.currentTestState.errorData,
            resultados_antibioticos: data.resultados || [],
            imagem1_path: data.imagem1_path || null,
            imagem2_path: data.imagem2_path || null
        };
        delete this.pendingConfirmationData.errorData;
        this.showConfirmationModal(this.pendingConfirmationData);
        return;
    }

    // Prepara os dados do teste, assumindo sucesso inicial
    let finalTestData = {
        ...this.currentTestState,
        sucesso: true,
        motivo_erro: null,
        resultados_antibioticos: data.resultados || [],
        imagem1_path: data.imagem1_path || null,
        imagem2_path: data.imagem2_path || null
    };

    // Realiza a validação dos resultados
    if (data.resultados && Array.isArray(data.resultados)) {
        for (const resultado of data.resultados) {
            const range = this.ANTIBIOTIC_RANGES[resultado.nome];
            if (range) {
                const diametro = parseFloat(resultado.diametro_halo);
                // Se encontrar um valor inválido, atualiza o status do teste e para a verificação
                if (isNaN(diametro) || diametro < range.min || diametro > range.max) {
                    finalTestData.sucesso = false;
                    finalTestData.motivo_erro = `Diâmetro do halo para ${resultado.nome} (${diametro} mm) fora do intervalo permitido.`;
                    break; // Sai do loop no primeiro erro encontrado
                }
            }
        }
    }

    // ATRIBUI os dados finais e MOSTRA o modal, independentemente do resultado (sucesso ou falha)
    this.pendingConfirmationData = finalTestData;
    this.showConfirmationModal(this.pendingConfirmationData);
}

    bindConfirmationModalEvents() {
        const confirmBtn = document.getElementById('confirmTestButton');
        const rejectBtn = document.getElementById('rejectTestButton');
        const submitRejectionBtn = document.getElementById('submitRejectionButton');
        const closeModal = document.getElementById('closeConfirmationModal');

        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.handleUserConfirmation());
        }
        if (rejectBtn) {
            rejectBtn.addEventListener('click', () => this.handleUserRejection());
        }
        if (submitRejectionBtn) {
            submitRejectionBtn.addEventListener('click', () => this.submitUserRejection());
        }
        if(closeModal) {
            closeModal.addEventListener('click', () => this.hideConfirmationModal());
        }
    }

    async handleErrorMessage(data) {
        console.log("Recebida mensagem de erro:", data);
        if (!this.currentTestState || this.waitingForEndAfterError) return;

        if (this.countdownInterval) clearInterval(this.countdownInterval);
        
        const countdownDisplay = document.getElementById('countdownDisplay');
        if (countdownDisplay) countdownDisplay.textContent = `${data.error} - Finalizando...`;
        
        this.waitingForEndAfterError = true;
        
        this.currentTestState.errorData = {
            sucesso: false,
            motivo_erro: data.error,
        };
        
        localStorage.setItem('activeTestState', JSON.stringify(this.currentTestState));
        this.publishRelease({ release: false });
    }

    showConfirmationModal(data) {
    const modal = document.getElementById('testConfirmationModal');
    if (!modal) return;

    // Lógica para popular os novos campos adicionados
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value ?? '--';
    };

    setText('confirm-bacteria', data.bacteria);
    const dataApp = new Date(data.data);
    setText('confirm-data', dataApp.toLocaleString('pt-BR'));
    setText('confirm-lote', data.lote);
    setText('confirm-funcionario', data.funcionario_responsavel_nome);
    setText('confirm-duracao', this.app.formatTestDuration(data.duracao)); // Reutilizando a função de formatação
    
    // Usando toFixed(2) para garantir duas casas decimais, com fallback para '--'
    setText('confirm-temp-max', data.temperatura_max?.toFixed(2));
    setText('confirm-temp-min', data.temperatura_min?.toFixed(2));
    setText('confirm-co2-max', data.co_max?.toFixed(2));
    setText('confirm-co2-min', data.co_min?.toFixed(2));
    
    // Lógica para status (sucesso/falha)
    const statusEl = document.getElementById('confirm-status');
    const motivoContainer = document.getElementById('confirm-motivo-container');
    const motivoEl = document.getElementById('confirm-motivo');

    if (data.sucesso) {
        statusEl.textContent = 'Sim';
        statusEl.style.color = 'green';
        motivoContainer.style.display = 'none';
    } else {
        statusEl.textContent = 'Não';
        statusEl.style.color = 'red';
        motivoEl.textContent = data.motivo_erro;
        motivoContainer.style.display = 'block';
    }

    // MODIFICADO: Popula a lista de antibióticos (ul) em vez da tabela (table)
    const antibioticosList = document.getElementById('confirm-antibioticos-list');
    const noAntibioticosMsg = document.getElementById('confirm-no-antibioticos');
    antibioticosList.innerHTML = ''; // Limpa a lista anterior
    
    if (data.resultados_antibioticos && data.resultados_antibioticos.length > 0) {
        noAntibioticosMsg.style.display = 'none';
        data.resultados_antibioticos.forEach(res => {
            const li = document.createElement('li');
            li.textContent = `${res.nome} - Halo: ${res.diametro_halo} mm`;
            antibioticosList.appendChild(li);
        });
    } else {
        noAntibioticosMsg.style.display = 'block';
    }

    // Lógica para imagens
    const imagesTitle = document.getElementById('confirm-images-title');
    const imagesContainer = document.getElementById('confirm-images-container');
    const img1 = document.getElementById('confirm-image1');
    const img2 = document.getElementById('confirm-image2');
    
    let hasImages = false;
    if (img1 && data.imagem1_path) {
        img1.src = `${API_BASE}${data.imagem1_path}`;
        img1.style.display = 'block';
        hasImages = true;
    } else if (img1) {
        img1.style.display = 'none';
    }
    
    if (img2 && data.imagem2_path) {
        img2.src = `${API_BASE}${data.imagem2_path}`;
        img2.style.display = 'block';
        hasImages = true;
    } else if (img2) {
        img2.style.display = 'none';
    }
    
    if (imagesContainer) imagesContainer.style.display = hasImages ? 'flex' : 'none';
    if (imagesTitle) imagesTitle.style.display = hasImages ? 'block' : 'none';

    // Reseta a UI do modal (sem alteração)
    document.getElementById('rejection-reason-container').style.display = 'none';
    document.getElementById('confirmation-actions').style.display = 'flex';
    document.getElementById('userRejectionReason').value = '';

    modal.style.display = 'flex';
}
    
    // NOVO: Esconde o modal de confirmação
    hideConfirmationModal() {
        const modal = document.getElementById('testConfirmationModal');
        if(modal) modal.style.display = 'none';
        this.pendingConfirmationData = null; // Limpa os dados pendentes
    }
    
    // NOVO: Lida com a confirmação do usuário
    async handleUserConfirmation() {
        if (!this.pendingConfirmationData) return;

        const dataToSave = this.pendingConfirmationData;

        // Salva e gera QR Code
        await this.saveTestToDatabase(dataToSave);
        await this.generateAndSaveQrCode(dataToSave);

        // Limpa a UI
        this.hideConfirmationModal();
        this.setIdleUI();
    }

    // NOVO: Lida com o clique no botão de rejeição
    handleUserRejection() {
        document.getElementById('rejection-reason-container').style.display = 'block';
        document.getElementById('confirmation-actions').style.display = 'none';
    }

    // NOVO: Lida com o envio da rejeição do usuário
    async submitUserRejection() {
        if (!this.pendingConfirmationData) return;

        const reason = document.getElementById('userRejectionReason').value;
        if (!reason.trim()) {
            alert(this.i18n.t('rejectionReasonRequired'));
            return;
        }

        // Modifica os dados do teste para refletir a rejeição do usuário
        const dataToSave = {
            ...this.pendingConfirmationData,
            sucesso: false,
            motivo_erro: reason.trim()
        };

        // Salva e gera QR Code
        await this.saveTestToDatabase(dataToSave);
        await this.generateAndSaveQrCode(dataToSave);

        // Limpa a UI
        this.hideConfirmationModal();
        this.setIdleUI();
    }

    handleStorageMessage(data) {
        const MIN_TEMP = 10.0, MAX_TEMP = 35.0;
        
        console.log("Recebida mensagem do armazém:", data);
        console.log("Temperatura do armazém:", data.permission);
        
        const noTestMessage = document.getElementById('noTestMessage');
        const startNewTestButton = document.getElementById('startNewTestButton');
        
        if (typeof data.permission === 'number') {
            if (data.permission >= MIN_TEMP && data.permission <= MAX_TEMP) {
                this.permissionDoTest = true;
                if (noTestMessage) {
                    noTestMessage.textContent = this.i18n.t('storageTemperatureOk');
                }
                if (startNewTestButton) {
                    startNewTestButton.style.display = 'block';
                }
                console.log("Temperatura do armazém OK:", data.permission);
            } else {
                this.permissionDoTest = false;
                if (noTestMessage) {
                    noTestMessage.textContent = this.i18n.t('storageTemperatureError');
                }
                if (startNewTestButton) {
                    startNewTestButton.style.display = 'none';
                }
                console.log("Temperatura do armazém fora do intervalo:", data.permission);
            }
        }
    }

    

    // Métodos de UI
    setIdleUI() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        if (this.recognitionInterval) {
            clearInterval(this.recognitionInterval);
        }
        
        this.countdownInterval = null;
        this.recognitionInterval = null;
        this.isWaitingForSetup = false;
        this.waitingForEndAfterError = false;
        this.currentTestState = null;
        
        localStorage.removeItem('activeTestState');
        
        const elements = {
            testDetails: document.getElementById('testDetails'),
            tempoRestante: document.getElementById('tempoRestante'),
            abortarButtonContainer: document.getElementById('abortar-button-container'),
            noTestContainer: document.getElementById('noTestContainer'),
            noTestMessage: document.getElementById('noTestMessage')
        };
        
        if (elements.testDetails) elements.testDetails.style.display = 'none';
        if (elements.tempoRestante) elements.tempoRestante.style.display = 'none';
        if (elements.abortarButtonContainer) elements.abortarButtonContainer.style.display = 'none';
        if (elements.noTestContainer) elements.noTestContainer.style.display = 'block';
        if (elements.noTestMessage) elements.noTestMessage.textContent = 'Aguardando início de um novo teste...';
    }

    setActiveTestUI() {
        const elements = {
            noTestContainer: document.getElementById('noTestContainer'),
            testDetails: document.getElementById('testDetails'),
            tempoRestante: document.getElementById('tempoRestante'),
            abortarButtonContainer: document.getElementById('abortar-button-container')
        };
        
        if (elements.noTestContainer) elements.noTestContainer.style.display = 'none';
        if (elements.testDetails) elements.testDetails.style.display = 'block';
        if (elements.tempoRestante) elements.tempoRestante.style.display = 'block';
        if (elements.abortarButtonContainer) elements.abortarButtonContainer.style.display = 'block';
    }

    updateTestUI() {
        if (!this.currentTestState) return;
        
        const elements = {
            lote: document.getElementById('test-lote'),
            bacteria: document.getElementById('test-bacteria'),
            data: document.getElementById('test-data'),
            funcionario: document.getElementById('test-funcionario'),
            duracao: document.getElementById('test-duracao'),
            antibioticos: document.getElementById('test-antibioticos')
        };
        
        if (elements.lote) elements.lote.textContent = this.currentTestState.lote;
        if (elements.bacteria) elements.bacteria.textContent = this.currentTestState.bacteria;
        if (elements.data) elements.data.textContent = new Date(this.currentTestState.data).toLocaleString('pt-BR');
        if (elements.funcionario) elements.funcionario.textContent = this.currentTestState.funcionario_responsavel_nome;
        if (elements.duracao) elements.duracao.textContent = this.app.formatTestDuration(this.currentTestState.duracao);
        if (elements.antibioticos) {
            elements.antibioticos.innerHTML = this.currentTestState.antibioticos_testados.map(ab => `<li>${ab.nome}</li>`).join('') || `<li>${this.i18n.t('noneSpecified')}</li>`;
        }

        if (elements.imagem1 && this.currentTestState.imagem1_url) {
        elements.imagem1.src = this.currentTestState.imagem1_url;
        elements.imagem1.style.display = 'block';
    }
    if (elements.imagem2 && this.currentTestState.imagem2_url) {
        elements.imagem2.src = this.currentTestState.imagem2_url;
        elements.imagem2.style.display = 'block';
    }
    }

    startCountdown(durationInSeconds) {
        let remainingTime = durationInSeconds;
        const countdownDisplay = document.getElementById('countdownDisplay');
        
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
        }
        
        this.countdownInterval = setInterval(() => {
            if (remainingTime <= 0) {
                clearInterval(this.countdownInterval);
                if (countdownDisplay) {
                    countdownDisplay.textContent = this.i18n.t('resultsWaiting');
                }
                this.publishRelease({ release: false }); 
                return;
            }
            
            remainingTime--;
            const h = String(Math.floor(remainingTime / 3600)).padStart(2, '0');
            const m = String(Math.floor((remainingTime % 3600) / 60)).padStart(2, '0');
            const s = String(remainingTime % 60).padStart(2, '0');
            
            if (countdownDisplay) {
                countdownDisplay.textContent = `${h}:${m}:${s}`;
            }
        }, 1000);
    }

    checkForActiveTest() {
        const savedStateJSON = localStorage.getItem('activeTestState');
        if (!savedStateJSON) {
            this.setIdleUI();
            return;
        }

        this.currentTestState = JSON.parse(savedStateJSON);
        this.waitingForEndAfterError = !!this.currentTestState.errorData;

        if (this.waitingForEndAfterError) {
            this.handleErrorMessage(this.currentTestState.errorData);
        } else if (Date.now() >= this.currentTestState.testEndTime) {
            this.setActiveTestUI();
            const countdownDisplay = document.getElementById('countdownDisplay');
            if (countdownDisplay) {
                countdownDisplay.textContent = "Aguardando resultados...";
            }
        } else {
            this.setActiveTestUI();
            const remainingSeconds = Math.round((this.currentTestState.testEndTime - Date.now()) / 1000);
            this.startCountdown(remainingSeconds);
        }

        setTimeout(() => this.updateTestUI(), 100);
    }

    async saveTestToDatabase(testData) {
        // Limpa propriedades que não devem ir para a base
        delete testData.errorData;
        delete testData.imagem1_base64;
        delete testData.imagem2_base64;
        delete testData.testEndTime;


        
        try {
            const response = await fetch(`${API_BASE}/testes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(testData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Falha na resposta do servidor');
            }
            
            console.log('Teste salvo com sucesso:', await response.json());
        } catch (error) {
            console.error('Erro ao salvar o teste no banco de dados:', error);
            alert('Falha ao salvar o teste no banco de dados. Verifique o console.');
        }
    }

    async generateAndSaveQrCode(testData) {
    console.log("Gerando QR Code para o lote:", testData.lote);
    
    // 1. Prepara os dados (seu JSON hiper-compacto)
    const halosArray = [];
  if (Array.isArray(testData.resultados_antibioticos)) {
    testData.resultados_antibioticos.forEach(res => {
      const diam = (typeof res.diametro_halo === 'number')
        ? res.diametro_halo
        : parseFloat(res.diametro_halo);
      halosArray.push({
        nome: res.nome,
        diametro_halo: Number.isFinite(diam) ? diam : null
      });
    });
  }
    const qrData = {
        lt: testData.lote,
        bac: testData.bacteria,
        ts: testData.data, // ts = timestamp
        resp: testData.funcionario_responsavel_nome, // resp = responsável
        dur: testData.duracao, // s = segundos
        suc: testData.sucesso,
        err: testData.motivo_erro || undefined,
        tMax: testData.temperatura_max,
        tMin: testData.temperatura_min,
        co2Max: testData.co_max,
        co2Min: testData.co_min,
        //at: testData.antibioticos_testados.map(ab => ab.nome), // at = antibióticos testados
        halos: halosArray
    };
    const jsonString = JSON.stringify(qrData);

    // 2. Gera o QR Code diretamente para uma string de imagem (DataURL)
    try {
        const imageDataURL = await QRCode.toDataURL(jsonString, {
            errorCorrectionLevel: 'H', // Nível de correção baixo para mais dados
            margin: 2,
            scale: 8 // Controla a resolução da imagem final
        });

        // 3. Cria um nome de arquivo e chama a API do Electron para salvar
        const fileName = `QRCode_Lote_${testData.lote}.png`;

        if (window.electronAPI && window.electronAPI.saveQrCode) {
            const filePath = await window.electronAPI.saveQrCode(imageDataURL, fileName);
            console.log(`Solicitação para salvar ${fileName} enviada com sucesso.`);

            // 4. Imprime automaticamente
        if (window.electronAPI.printQrCode) {
            await window.electronAPI.printQrCode(filePath);
            console.log("QR Code enviado para impressão.");
        }
        } else {
            console.error('API do Electron (saveQrCode) não está disponível.');
        }

    } catch (error) {
        console.error('Erro ao gerar ou salvar QR Code com a nova biblioteca:', error);
    }
}
}