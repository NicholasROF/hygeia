// Importa a biblioteca de internacionalização i18n-js
import { I18n } from 'i18n-js';
// Importa utilitários de localização do Expo para detectar idioma do dispositivo
import * as Localization from 'expo-localization';

// Importa os arquivos JSON com as traduções para cada idioma suportado
import pt from '../../locales/pt.json'; // Traduções em português
import en from '../../locales/en.json'; // Traduções em inglês

// Cria uma nova instância do sistema de internacionalização
const i18n = new I18n();

// Configura as traduções disponíveis no sistema
// Cada chave (en, pt) corresponde a um idioma suportado
i18n.translations = {
  en, // Inglês
  pt, // Português
};

// DETECÇÃO AUTOMÁTICA DO IDIOMA DO DISPOSITIVO
// Obtém a lista de idiomas preferidos do usuário no dispositivo
const userLocales = Localization.getLocales();
// Define o idioma inicial baseado no primeiro idioma do dispositivo
// Se não conseguir detectar, usa português ('pt') como padrão
i18n.locale = userLocales[0]?.languageCode || 'pt';

// CONFIGURAÇÃO DE FALLBACK
// Quando uma tradução não estiver disponível para o idioma atual,
// o sistema usará automaticamente a tradução do idioma de fallback (primeiro da lista)
i18n.enableFallback = true;

// Exporta a instância configurada para uso em toda a aplicação
export default i18n;