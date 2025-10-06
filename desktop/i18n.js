// i18n.js - Sistema de Internacionalização (i18n)
// Gerencia traduções e localização da aplicação Hygeia
// Suporta múltiplos idiomas com detecção automática e seletor manual

/**
 * Classe responsável pela internacionalização da aplicação
 * Funcionalidades:
 * - Detecção automática do idioma do navegador
 * - Carregamento dinâmico de arquivos de tradução
 * - Formatação de data/hora por localidade
 * - Aplicação automática de traduções no DOM
 * - Seletor de idioma integrado
 */
class I18n {
    constructor() {
        this.translations = {};              // Armazena as traduções carregadas
        this.currentLang = this.getLanguage(); // Idioma atual detectado/salvo
    }

    /**
     * Detecta o idioma a ser usado na aplicação
     * Prioridade: 1) Idioma salvo no localStorage, 2) Idioma do navegador, 3) Português (padrão)
     * @returns {string} Código do idioma (pt-BR ou en)
     */
    getLanguage() {
        const savedLang = localStorage.getItem('language');
        if (savedLang) {
            return savedLang; // Usa idioma previamente selecionado pelo usuário
        }
        // Detecta idioma do navegador
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('en')) {
            return 'en'; // Inglês se navegador estiver em inglês
        }
        return 'pt-BR'; // Padrão: Português brasileiro
    }

    /**
     * Carrega arquivo de traduções do idioma especificado
     * Detecta automaticamente o caminho correto baseado na página atual
     * @param {string} lang - Código do idioma a carregar
     */
    async loadTranslations(lang = this.currentLang) {
        try {
            // Detecta o caminho correto baseado na localização atual da página
            let basePath = './locales/';
            if (window.location.pathname.includes('/login/') || window.location.pathname.includes('/registro/')) {
                basePath = '../locales/'; // Páginas em subpastas precisam voltar um nível
            } else if(window.location.pathname.includes('/spa.html')) {
                basePath = 'locales/';    // SPA está na raiz
            }
            
            const response = await fetch(`${basePath}${lang}.json`);
            if (!response.ok) {
                throw new Error(`Could not load ${lang}.json`);
            }
            
            this.translations = await response.json(); // Carrega traduções na memória
            this.currentLang = lang;
            localStorage.setItem('language', lang);    // Salva preferência do usuário
            console.log(`Language set to: ${lang}`);
        } catch (error) {
            console.error("Error loading translations:", error);
            // Fallback: tenta carregar português se outro idioma falhar
            if (lang !== 'pt-BR') {
                await this.loadTranslations('pt-BR');
            }
        }
    }

    /**
     * Traduz uma chave para o idioma atual
     * Suporta substituição de placeholders no formato {variavel}
     * @param {string} key - Chave da tradução
     * @param {Object} replacements - Objeto com substituições para placeholders
     * @returns {string} Texto traduzido
     */
    t(key, replacements = {}) {
        let translation = this.translations[key] || key; // Retorna a chave se tradução não existir
        
        // Substitui placeholders no formato {variavel} pelos valores fornecidos
        for (const placeholder in replacements) {
            translation = translation.replace(`{${placeholder}}`, replacements[placeholder]);
        }
        return translation;
    }

    /**
     * Formata data/hora de acordo com a localidade atual
     * @param {Date} date - Objeto Date a ser formatado
     * @returns {string} Data formatada ou '--' se inválida
     */
    formatDateTime(date) {
        if (!(date instanceof Date)) {
            return '--'; // Retorna placeholder se não for uma data válida
        }
        
        const locale = this.t('locale') || 'default'; // Obtém locale das traduções
        
        const options = {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false // Formato 24 horas
        };
        
        return date.toLocaleString(locale, options);
    }

    /**
     * Altera o idioma da aplicação
     * Recarrega a página para aplicar todas as mudanças
     * @param {string} lang - Novo idioma a ser definido
     */
    setLanguage(lang) {
        this.loadTranslations(lang).then(() => {
            // Recarrega a página para aplicar todas as mudanças de idioma
            window.location.reload();
        });
    }

    /**
     * Aplica traduções automaticamente a todos os elementos da página
     * Procura por elementos com atributo data-i18n-key e os traduz
     */
    async applyTranslationsToPage() {
        await this.loadTranslations();
        
        // Traduz elementos com atributo data-i18n-key
        document.querySelectorAll('[data-i18n-key]').forEach(element => {
            const key = element.getAttribute('data-i18n-key');           // Chave da tradução
            const attr = element.getAttribute('data-i18n-attr') || 'innerText'; // Atributo a ser traduzido
            
            if (attr === 'innerText') {
                element.innerText = this.t(key); // Traduz o texto interno
            } else {
                element.setAttribute(attr, this.t(key)); // Traduz atributo específico (ex: placeholder)
            }
        });
    }

    /**
     * Adiciona seletor de idioma no canto superior direito da página
     * Permite ao usuário trocar entre português e inglês
     */
    addLanguageSelector() {
        const selectorHTML = `
            <div style="position: absolute; top: 10px; right: 10px; z-index: 1000;">
                <select id="language-selector">
                    <option value="pt-BR">Português (BR)</option>
                    <option value="en">English (US)</option>
                </select>
            </div>
        `;
        
        document.body.insertAdjacentHTML('afterbegin', selectorHTML);
        const selector = document.getElementById('language-selector');
        selector.value = this.currentLang; // Define valor atual
        
        // Adiciona listener para mudança de idioma
        selector.addEventListener('change', (event) => {
            this.setLanguage(event.target.value);
        });
    }
}

// Inicializa e exporta uma instância única (Singleton)
const i18n = new I18n();
window.i18n = i18n; // Torna globalmente acessível para simplicidade de uso