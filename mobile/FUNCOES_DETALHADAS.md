# DETALHAMENTO DAS FUNÇÕES - HYGEIA MOBILE

## 📋 ÍNDICE DE FUNÇÕES POR ARQUIVO

### **src/config/i18n.tsx**
- **Configuração Automática de Idioma**
- **Sistema de Fallback**

### **src/context/LanguageContext.tsx**
- **`loadLocale()`** - Carrega idioma salvo
- **`setLocale()`** - Altera e persiste idioma

### **src/components/languageSwitcher.tsx**
- **`toggleLanguage()`** - Alterna entre idiomas

### **app/_layout.tsx**
- **`AppStack()`** - Configura navegação
- **`RootLayout()`** - Provedor raiz

### **app/index.tsx**
- **`navigateToScanner()`** - Navega para scanner
- **Renderização da tela principal**

### **app/leitor.tsx**
- **`getCameraPermissions()`** - Solicita permissões
- **`handleBarCodeScanned()`** - Processa QR Code
- **`handleScanAgain()`** - Reseta scanner
- **`DataRow()`** - Componente de linha de dados
- **`formatDuration()`** - Formata tempo
- **`renderScannedData()`** - Renderiza resultados

---

## 🔧 ANÁLISE DETALHADA DAS FUNÇÕES

### **1. SISTEMA DE INTERNACIONALIZAÇÃO**

#### **Configuração Inicial (i18n.tsx)**
```typescript
// FUNÇÃO: Detecção automática do idioma
const userLocales = Localization.getLocales();
i18n.locale = userLocales[0]?.languageCode || 'pt';

// O QUE FAZ:
// 1. Acessa as configurações de idioma do dispositivo
// 2. Pega o primeiro idioma da lista de preferências
// 3. Se não conseguir detectar, usa português como padrão
// 4. Define o idioma inicial do sistema de tradução

// FLUXO LÓGICO:
// Dispositivo → getLocales() → languageCode → i18n.locale
```

#### **Carregamento de Idioma Salvo (LanguageContext.tsx)**
```typescript
const loadLocale = async () => {
  const savedLocale = await AsyncStorage.getItem('user-locale');
  if (savedLocale) {
    i18n.locale = savedLocale;
    setLocaleState(savedLocale);
  } else {
    i18n.locale = 'pt';
    setLocaleState('pt');
  }
};

// O QUE FAZ:
// 1. Verifica se há um idioma salvo anteriormente
// 2. Se encontrar, usa o idioma salvo
// 3. Se não encontrar, usa português como padrão
// 4. Atualiza tanto o i18n quanto o estado do React

// FLUXO LÓGICO:
// AsyncStorage → savedLocale → i18n.locale + setState
```

#### **Alteração de Idioma (LanguageContext.tsx)**
```typescript
const setLocale = async (newLocale: string) => {
  i18n.locale = newLocale;                    // 1. Atualiza i18n
  setLocaleState(newLocale);                  // 2. Atualiza estado
  await AsyncStorage.setItem('user-locale', newLocale); // 3. Persiste
};

// O QUE FAZ:
// 1. Atualiza a instância do i18n para traduções imediatas
// 2. Atualiza o estado do React para re-renderização
// 3. Salva a preferência no armazenamento local

// FLUXO LÓGICO:
// newLocale → i18n.locale → setState → AsyncStorage
```

### **2. SISTEMA DE NAVEGAÇÃO**

#### **Configuração de Navegação (AppStack)**
```typescript
<Stack key={locale} screenOptions={{...}}>
  <Stack.Screen name="index" options={{ title: i18n.t('homeTitle') }} />
  <Stack.Screen name="leitor" options={{ title: i18n.t('scannerTitle') }} />
</Stack>

// O QUE FAZ:
// 1. A prop 'key' força re-renderização quando idioma muda
// 2. screenOptions define aparência global dos headers
// 3. Cada Screen define uma rota com título traduzido

// FLUXO LÓGICO:
// locale muda → key muda → Stack re-renderiza → títulos atualizados
```

#### **Navegação para Scanner**
```typescript
const navigateToScanner = () => {
  router.push('/leitor');
};

// O QUE FAZ:
// 1. Usa o Expo Router para navegar
// 2. Push adiciona nova tela na pilha de navegação
// 3. Permite voltar com botão nativo

// FLUXO LÓGICO:
// Botão pressionado → router.push → nova tela carregada
```

### **3. SISTEMA DE SCANNER**

#### **Solicitação de Permissões**
```typescript
const getCameraPermissions = async () => {
  const { status } = await Camera.requestCameraPermissionsAsync();
  setHasPermission(status === 'granted');
};

// O QUE FAZ:
// 1. Solicita permissão do sistema para usar câmera
// 2. Aguarda resposta do usuário (granted/denied)
// 3. Atualiza estado baseado na resposta

// FLUXO LÓGICO:
// Componente monta → solicita permissão → usuário responde → estado atualizado
```

#### **Processamento do QR Code**
```typescript
const handleBarCodeScanned = ({ data }: { data: string }) => {
  try {
    const parsedData = JSON.parse(data) as IScanData;
    if (!parsedData.lt || !parsedData.bac || !parsedData.ts) {
      throw new Error('Dados incompletos');
    }
    setScannedData(parsedData);
  } catch (error) {
    Alert.alert(i18n.t('error'), i18n.t('invalidQRCode'));
  }
};

// O QUE FAZ:
// 1. Recebe string do QR Code escaneado
// 2. Tenta converter JSON string em objeto
// 3. Valida se campos obrigatórios existem
// 4. Se válido: armazena dados; se inválido: mostra erro

// FLUXO LÓGICO:
// QR detectado → JSON.parse → validação → sucesso/erro
```

### **4. FORMATAÇÃO DE DADOS**

#### **Formatação de Duração**
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

// O QUE FAZ:
// 1. Converte segundos totais em horas, minutos e segundos
// 2. Cria array com partes não-zero
// 3. Aplica singular/plural correto para cada parte
// 4. Junta partes com espaço ou retorna "0 segundos"

// EXEMPLOS:
// 3661 segundos → "1 hora 1 minuto 1 segundo"
// 7200 segundos → "2 horas"
// 90 segundos → "1 minuto 30 segundos"
// 0 segundos → "0 segundos"
```

#### **Componente de Linha de Dados**
```typescript
const DataRow = ({ label, value, isSuccess }) => (
  <View style={styles.dataRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={[
      styles.value,
      isSuccess !== undefined && { 
        color: isSuccess ? COLORS.success : COLORS.error,
        fontWeight: 'bold' 
      }
    ]}>
      {value}
    </Text>
  </View>
);

// O QUE FAZ:
// 1. Cria layout consistente para pares label-valor
// 2. Aplica coloração condicional baseada em sucesso/erro
// 3. Mantém alinhamento e espaçamento padronizados

// FLUXO LÓGICO:
// Props → layout → coloração condicional → renderização
```

### **5. RENDERIZAÇÃO CONDICIONAL**

#### **Estados da Tela do Scanner**
```typescript
// Estado 1: Verificando permissão
if (hasPermission === null) {
  return <Text>{i18n.t('requestingPermission')}</Text>;
}

// Estado 2: Permissão negada
if (hasPermission === false) {
  return (
    <View>
      <Text>{i18n.t('cameraAccessDenied')}</Text>
      <TouchableOpacity onPress={() => router.back()}>
        <Text>{i18n.t('goBack')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// Estado 3: Scanner ativo vs Resultados
return scannedData ? renderScannedData() : (
  <CameraView onBarcodeScanned={handleBarCodeScanned} />
);

// O QUE FAZ:
// 1. Verifica estado das permissões
// 2. Renderiza interface apropriada para cada estado
// 3. Oferece ações relevantes (voltar, configurações)
// 4. Alterna entre scanner e visualização de dados

// FLUXO LÓGICO:
// hasPermission → null/false/true → interface correspondente
```

---

## 🎯 PADRÕES DE DESIGN UTILIZADOS

### **1. Context Pattern**
- **Onde**: `LanguageContext.tsx`
- **Por quê**: Compartilhar estado de idioma globalmente
- **Como**: Provider envolve app, componentes usam useContext

### **2. Custom Hooks Pattern**
- **Onde**: Implícito no uso de useState/useEffect
- **Por quê**: Lógica reutilizável e separação de responsabilidades
- **Como**: Hooks encapsulam lógica específica

### **3. Render Props Pattern**
- **Onde**: `DataRow` component
- **Por quê**: Componente reutilizável com customização
- **Como**: Props determinam aparência e comportamento

### **4. Error Boundary Pattern**
- **Onde**: Try/catch em `handleBarCodeScanned`
- **Por quê**: Tratamento gracioso de erros
- **Como**: Captura erros e exibe feedback ao usuário

### **5. Conditional Rendering Pattern**
- **Onde**: Estados do scanner
- **Por quê**: Interface dinâmica baseada em estado
- **Como**: Operadores ternários e condicionais

---

## 🔄 FLUXOS DE DADOS PRINCIPAIS

### **Fluxo de Inicialização**
```
App inicia → LanguageProvider monta → loadLocale() → AsyncStorage → i18n.locale → UI renderizada
```

### **Fluxo de Mudança de Idioma**
```
Usuário toca seletor → toggleLanguage() → setLocale() → i18n + state + AsyncStorage → key muda → re-render
```

### **Fluxo de Escaneamento**
```
Tela monta → getCameraPermissions() → CameraView → QR detectado → handleBarCodeScanned() → JSON.parse → setScannedData → renderScannedData()
```

### **Fluxo de Navegação**
```
Tela inicial → botão pressionado → router.push() → nova tela → permissões → scanner/resultados
```

---

## 🛡️ TRATAMENTO DE ERROS

### **Tipos de Erro Tratados**
1. **Permissão de câmera negada**
2. **QR Code com JSON inválido**
3. **Dados incompletos no QR Code**
4. **Erro ao salvar/carregar idioma**
5. **Erro de navegação**

### **Estratégias de Tratamento**
1. **Try/Catch**: Para operações que podem falhar
2. **Valores padrão**: Fallback para português
3. **Feedback visual**: Alerts e mensagens de erro
4. **Ações de recuperação**: Botões para tentar novamente

---

Este detalhamento fornece uma visão completa de como cada função opera dentro do ecossistema do HYGEIA Mobile, suas responsabilidades específicas e como elas se integram para criar uma experiência de usuário coesa e robusta.