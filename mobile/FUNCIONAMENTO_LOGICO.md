# GUIA COMPLETO: FUNCIONAMENTO LÓGICO DO HYGEIA MOBILE

## 📋 VISÃO GERAL DO PROJETO

O **HYGEIA Mobile** é um aplicativo React Native que funciona como um leitor especializado de QR Codes para análises microbiológicas. O app permite que profissionais da área da saúde escaneiem códigos QR contendo dados científicos complexos e visualizem os resultados de forma organizada e traduzida.

---

## 🔄 FLUXO PRINCIPAL DA APLICAÇÃO

### 1. **INICIALIZAÇÃO DA APLICAÇÃO**
```
Usuário abre o app
    ↓
RootLayout carrega o LanguageProvider
    ↓
LanguageProvider verifica idioma salvo no AsyncStorage
    ↓
Se encontrar idioma salvo → usa ele
Se não encontrar → usa português como padrão
    ↓
AppStack é renderizado com o idioma definido
    ↓
Tela principal (Index) é exibida
```

### 2. **GERENCIAMENTO DE IDIOMA**
```
Usuário toca no LanguageSwitcher
    ↓
toggleLanguage() é executada
    ↓
Novo idioma é definido (pt ↔ en)
    ↓
setLocale() atualiza:
  - Estado local do contexto
  - Instância do i18n
  - AsyncStorage (persistência)
    ↓
Mudança de 'key' no Stack força re-renderização
    ↓
Toda a interface é atualizada com novo idioma
```

### 3. **NAVEGAÇÃO PARA SCANNER**
```
Usuário toca em "Escanear QR Code"
    ↓
router.push('/leitor') é executado
    ↓
Expo Router navega para app/leitor.tsx
    ↓
LeitorScreen é montado
    ↓
Solicita permissão da câmera
```

### 4. **PROCESSO DE ESCANEAMENTO**
```
Permissão da câmera concedida
    ↓
CameraView é renderizado
    ↓
Usuário aponta câmera para QR Code
    ↓
onBarcodeScanned é disparado
    ↓
handleBarCodeScanned processa os dados:
  - Tenta fazer JSON.parse() dos dados
  - Se sucesso → armazena em scannedData
  - Se erro → exibe alerta de QR inválido
    ↓
Interface muda para exibição de resultados
```

---

## 🏗️ ARQUITETURA DETALHADA

### **CAMADA DE CONFIGURAÇÃO**
- **`src/config/i18n.tsx`**: Configura sistema de tradução
- **`src/styles.tsx`**: Define paleta de cores e estilos globais

### **CAMADA DE CONTEXTO**
- **`src/context/LanguageContext.tsx`**: Gerencia estado global do idioma

### **CAMADA DE COMPONENTES**
- **`src/components/languageSwitcher.tsx`**: Componente de troca de idioma

### **CAMADA DE TELAS**
- **`app/_layout.tsx`**: Layout raiz e configuração de navegação
- **`app/index.tsx`**: Tela principal
- **`app/leitor.tsx`**: Tela do scanner e visualização de dados

### **CAMADA DE DADOS**
- **`locales/pt.json`**: Traduções em português
- **`locales/en.json`**: Traduções em inglês

---

## 🔧 FUNCIONAMENTO DAS PRINCIPAIS FUNÇÕES

### **1. Sistema de Internacionalização**

#### `i18n.tsx` - Configuração Inicial
```typescript
// Detecta idioma do dispositivo automaticamente
const userLocales = Localization.getLocales();
i18n.locale = userLocales[0]?.languageCode || 'pt';

// Habilita fallback para português se tradução não existir
i18n.enableFallback = true;
```

#### `LanguageContext.tsx` - Gerenciamento Global
```typescript
// Carrega idioma salvo na inicialização
const loadLocale = async () => {
  const savedLocale = await AsyncStorage.getItem('user-locale');
  if (savedLocale) {
    i18n.locale = savedLocale;
    setLocaleState(savedLocale);
  }
};

// Salva nova preferência de idioma
const setLocale = async (newLocale: string) => {
  i18n.locale = newLocale;                    // Atualiza i18n
  setLocaleState(newLocale);                  // Atualiza estado
  await AsyncStorage.setItem('user-locale', newLocale); // Persiste
};
```

### **2. Sistema de Navegação**

#### `_layout.tsx` - Re-renderização Inteligente
```typescript
// A 'key' força re-renderização completa quando idioma muda
<Stack key={locale}>
  <Stack.Screen name="index" options={{ title: i18n.t('homeTitle') }} />
  <Stack.Screen name="leitor" options={{ title: i18n.t('scannerTitle') }} />
</Stack>
```

### **3. Scanner de QR Code**

#### `leitor.tsx` - Processamento de Dados
```typescript
// Interface que define estrutura dos dados científicos
interface IScanData {
  lt: string;           // Lote
  bac: string;          // Bactéria
  ts: string;           // Timestamp
  resp: string;         // Responsável
  dur: number;          // Duração
  suc: boolean;         // Sucesso
  tMax: number;         // Temperatura máxima
  tMin: number;         // Temperatura mínima
  co2Max: number;       // CO2 máximo
  co2Min: number;       // CO2 mínimo
  halos: Array<{        // Halos de inibição
    nome: string;
    diametro_halo: number | null;
  }>;
}

// Processa dados do QR Code
const handleBarCodeScanned = ({ data }: { data: string }) => {
  try {
    const parsedData = JSON.parse(data) as IScanData;
    setScannedData(parsedData);
  } catch (error) {
    Alert.alert(i18n.t('error'), i18n.t('invalidQRCode'));
  }
};
```

### **4. Formatação de Dados**

#### Conversão de Duração
```typescript
const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  
  const parts = [];
  if (h > 0) parts.push(`${h} ${i18n.t(h === 1 ? 'hour' : 'hours')}`);
  if (m > 0) parts.push(`${m} ${i18n.t(m === 1 ? 'minute' : 'minutes')}`);
  if (s > 0) parts.push(`${s} ${i18n.t(s === 1 ? 'second' : 'seconds')}`);
  
  return parts.length > 0 ? parts.join(' ') : `0 ${i18n.t('seconds')}`;
};
```

---

## 🎯 ESTADOS DA APLICAÇÃO

### **Estados do Scanner**
1. **Solicitando Permissão**: `hasPermission === null`
2. **Permissão Negada**: `hasPermission === false`
3. **Scanner Ativo**: `hasPermission === true && !scannedData`
4. **Exibindo Resultados**: `hasPermission === true && scannedData`

### **Estados do Idioma**
1. **Carregando**: Verificando AsyncStorage
2. **Português**: `locale === 'pt'`
3. **Inglês**: `locale === 'en'`

---

## 📱 FLUXO DE INTERFACE DO USUÁRIO

### **Tela Principal (Index)**
```
Logo HYGEIA (circular)
    ↓
Mensagem explicativa (traduzida)
    ↓
Botão "Escanear QR Code" (traduzido)
    ↓
Seletor de idioma (flutuante, inferior)
```

### **Tela do Scanner (Leitor)**
```
Se sem permissão:
  Mensagem + Botões (Voltar/Configurações)

Se com permissão:
  Câmera em tela cheia
  
Se dados escaneados:
  ScrollView com:
    - Informações Gerais
    - Resultados do Teste
    - Análise de Antibióticos
    - Botão "Escanear Novamente"
```

---

## 🔄 CICLO DE VIDA DOS COMPONENTES

### **RootLayout**
1. Monta LanguageProvider
2. LanguageProvider carrega idioma do AsyncStorage
3. Renderiza AppStack com idioma definido

### **AppStack**
1. Recebe locale do contexto
2. Sincroniza i18n.locale
3. Renderiza Stack com key=locale
4. Quando locale muda, key muda → re-renderização completa

### **Index**
1. Acessa contexto de idioma
2. Sincroniza i18n (redundância segura)
3. Renderiza interface com traduções

### **LeitorScreen**
1. Solicita permissão da câmera
2. Se concedida: renderiza CameraView
3. Ao escanear: processa JSON e atualiza estado
4. Renderiza resultados ou mantém scanner ativo

---

## 🛡️ TRATAMENTO DE ERROS

### **Permissões da Câmera**
- Verifica status da permissão
- Oferece botões para voltar ou abrir configurações
- Mensagens traduzidas para cada situação

### **QR Code Inválido**
- Try/catch no JSON.parse()
- Alert com mensagem traduzida
- Mantém scanner ativo para nova tentativa

### **Carregamento de Idioma**
- Try/catch no AsyncStorage
- Fallback para português em caso de erro
- Log de erro para debugging

---

## 📊 ESTRUTURA DE DADOS DO QR CODE

O QR Code deve conter um JSON com a seguinte estrutura:

```json
{
  "lt": "LOTE123",
  "bac": "E. coli",
  "ts": "2024-01-15T10:30:00Z",
  "resp": "Dr. Silva",
  "dur": 7200,
  "suc": true,
  "tMax": 37.5,
  "tMin": 36.8,
  "co2Max": 450,
  "co2Min": 380,
  "halos": [
    {
      "nome": "Ampicilina",
      "diametro_halo": 15.5
    },
    {
      "nome": "Penicilina",
      "diametro_halo": null
    }
  ]
}
```

---

## 🎨 SISTEMA DE ESTILOS

### **Paleta de Cores**
- **Primary**: `#6A0E1D` (Vermelho escuro profissional)
- **Accent**: `#FFFFFF` (Branco para contraste)
- **Text**: `#343A40` (Cinza escuro)
- **Success**: `#27ae60` (Verde)
- **Error**: `#DC3545` (Vermelho)

### **Componentes Reutilizáveis**
- **STYLES.container**: Layout padrão com padding
- **STYLES.button**: Botão primário com sombra
- **STYLES.card**: Card com bordas arredondadas
- **STYLES.title**: Título principal

---

## 🚀 OTIMIZAÇÕES IMPLEMENTADAS

1. **Re-renderização Inteligente**: Uso de `key` no Stack
2. **Persistência de Preferências**: AsyncStorage para idioma
3. **Fallback de Tradução**: i18n.enableFallback = true
4. **Detecção Automática**: Idioma do dispositivo como padrão
5. **Tratamento Robusto**: Try/catch em operações críticas
6. **Performance**: Componentes funcionais com hooks

---

Este guia fornece uma visão completa do funcionamento lógico do HYGEIA Mobile, desde a inicialização até o processamento de dados científicos complexos, sempre mantendo a internacionalização e a experiência do usuário como prioridades.