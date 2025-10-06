// Importações necessárias do React e React Native
import React, { useState, useEffect, useContext } from 'react';
import { 
  Text, 
  View, 
  StyleSheet, 
  ScrollView, 
  SafeAreaView, 
  TouchableOpacity, 
  Linking, 
  Alert 
} from 'react-native';
// Componentes da câmera do Expo
import { CameraView, Camera } from 'expo-camera';
// Sistema de navegação
import { router } from 'expo-router';
// Estilos e cores padronizados
import { STYLES, COLORS } from '../src/styles';
// Sistema de internacionalização
import i18n from '../src/config/i18n';
// Contexto global de idioma
import { LanguageContext } from '../src/context/LanguageContext';

// INTERFACE DOS DADOS CIENTÍFICOS DO QR CODE
// Define a estrutura exata dos dados que o QR Code deve conter
// Esta interface garante type safety e documenta o formato esperado
interface IScanData {
  lt: string;           // Lote do teste (ex: "LOTE123")
  bac: string;          // Nome da bactéria analisada (ex: "E. coli")
  ts: string;           // Timestamp ISO do teste (ex: "2024-01-15T10:30:00Z")
  resp: string;         // Nome do responsável pelo teste (ex: "Dr. Silva")
  dur: number;          // Duração do teste em segundos (ex: 7200 = 2 horas)
  suc: boolean;         // Indica se o teste foi bem-sucedido
  err?: string;         // Mensagem de erro (opcional, só presente se suc = false)
  tMax: number;         // Temperatura máxima registrada durante o teste
  tMin: number;         // Temperatura mínima registrada durante o teste
  co2Max: number;       // Nível máximo de CO2 registrado (em ppm)
  co2Min: number;       // Nível mínimo de CO2 registrado (em ppm)
  halos: Array<{        // Array com dados dos halos de inibição de antibióticos
    nome: string;                    // Nome do antibiótico testado
    diametro_halo: number | null;    // Diâmetro do halo em mm (null se não medido)
  }>;
}

// COMPONENTE PRINCIPAL DA TELA DO SCANNER
// Gerencia todo o fluxo: permissões, escaneamento e exibição de resultados
export default function LeitorScreen() {
  // ESTADOS DO COMPONENTE
  // Estado da permissão da câmera: null (verificando), true (concedida), false (negada)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // Estado dos dados escaneados: null (nenhum dado), IScanData (dados válidos)
  const [scannedData, setScannedData] = useState<IScanData | null>(null);
  
  // ACESSO AO CONTEXTO DE IDIOMA
  // Obtém o idioma atual para sincronizar traduções
  const { locale } = useContext(LanguageContext);
  
  // SINCRONIZAÇÃO DO SISTEMA DE TRADUÇÃO
  // Garante que todas as traduções desta tela usem o idioma correto
  i18n.locale = locale;

  // EFEITO DE INICIALIZAÇÃO - SOLICITA PERMISSÃO DA CÂMERA
  // Executa uma vez quando o componente é montado
  useEffect(() => {
    // Função assíncrona para solicitar permissão da câmera
    const getCameraPermissions = async () => {
      try {
        // Solicita permissão ao usuário para usar a câmera
        const { status } = await Camera.requestCameraPermissionsAsync();
        
        // Atualiza o estado baseado na resposta do usuário
        setHasPermission(status === 'granted');
      } catch (error) {
        // Em caso de erro, assume que a permissão foi negada
        console.log('Erro ao solicitar permissão da câmera:', error);
        setHasPermission(false);
      }
    };
    
    // Executa a solicitação de permissão
    getCameraPermissions();
  }, []); // Array vazio = executa apenas uma vez

  // FUNÇÃO DE PROCESSAMENTO DO QR CODE ESCANEADO
  // Chamada automaticamente quando um QR Code é detectado pela câmera
  const handleBarCodeScanned = ({ data }: { data: string }) => {
    try {
      // TENTATIVA DE PARSING DOS DADOS JSON
      // Converte a string do QR Code em objeto JavaScript
      const parsedData = JSON.parse(data) as IScanData;
      
      // VALIDAÇÃO BÁSICA DOS DADOS
      // Verifica se os campos obrigatórios estão presentes
      if (!parsedData.lt || !parsedData.bac || !parsedData.ts) {
        throw new Error('Dados incompletos no QR Code');
      }
      
      // Se chegou até aqui, os dados são válidos
      setScannedData(parsedData);
      
    } catch (error) {
      // TRATAMENTO DE ERRO
      // Exibe alerta traduzido informando que o QR Code é inválido
      console.log('Erro ao processar QR Code:', error);
      Alert.alert(
        i18n.t('error'),           // Título do alerta
        i18n.t('invalidQRCode')    // Mensagem do alerta
      );
    }
  };

  // FUNÇÃO PARA RESETAR O SCANNER
  // Permite ao usuário escanear um novo QR Code
  const handleScanAgain = () => {
    setScannedData(null); // Limpa os dados, voltando ao modo scanner
  };

  if (hasPermission === null) {
    return <View style={styles.permissionContainer}><Text>{i18n.t('requestingPermission')}</Text></View>;
  }
  if (hasPermission === false) {
    return (
      <View style={styles.permissionContainer}>
        <Text>{i18n.t('cameraAccessDenied')}</Text>
        <TouchableOpacity style={[STYLES.button, {marginTop: 20}]} onPress={() => router.back()}>
            <Text style={STYLES.buttonText}>{i18n.t('goBack')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[STYLES.button, {marginTop: 10, backgroundColor: COLORS.textSecondary}]} onPress={() => Linking.openSettings()}>
            <Text style={STYLES.buttonText}>{i18n.t('openSettings')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // COMPONENTE DE LINHA DE DADOS
  // Componente reutilizável para exibir pares label-valor de forma consistente
  const DataRow = ({ 
    label,      // Rótulo/nome do campo (ex: "Lote")
    value,      // Valor do campo (ex: "LOTE123")
    isSuccess   // Opcional: indica sucesso (verde) ou erro (vermelho)
  }: { 
    label: string; 
    value: string | number; 
    isSuccess?: boolean 
  }) => (
    <View style={styles.dataRow}>
      {/* Rótulo do campo */}
      <Text style={styles.label}>{label}</Text>
      
      {/* Valor do campo com coloração condicional */}
      <Text style={[
        styles.value,
        // Aplica cor especial se isSuccess for definido
        isSuccess !== undefined && { 
          color: isSuccess ? COLORS.success : COLORS.error, 
          fontWeight: 'bold' 
        }
      ]}>
        {value}
      </Text>
    </View>
  );

  // FUNÇÃO DE FORMATAÇÃO DE DURAÇÃO
  // Converte segundos em formato legível (ex: "2 horas 30 minutos")
  const formatDuration = (seconds: number): string => {
    // CÁLCULOS DE CONVERSÃO
    const h = Math.floor(seconds / 3600);           // Horas
    const m = Math.floor((seconds % 3600) / 60);    // Minutos
    const s = seconds % 60;                         // Segundos restantes
    
    // CONSTRUÇÃO DA STRING FORMATADA
    const parts = [];
    
    // Adiciona horas se houver
    if (h > 0) {
      const hourText = i18n.t(h === 1 ? 'hour' : 'hours'); // Singular/plural
      parts.push(`${h} ${hourText}`);
    }
    
    // Adiciona minutos se houver
    if (m > 0) {
      const minuteText = i18n.t(m === 1 ? 'minute' : 'minutes'); // Singular/plural
      parts.push(`${m} ${minuteText}`);
    }
    
    // Adiciona segundos se houver
    if (s > 0) {
      const secondText = i18n.t(s === 1 ? 'second' : 'seconds'); // Singular/plural
      parts.push(`${s} ${secondText}`);
    }
    
    // RETORNO FINAL
    // Se há partes, junta com espaço; senão, retorna "0 segundos"
    return parts.length > 0 ? parts.join(' ') : `0 ${i18n.t('seconds')}`;
  };

  const renderScannedData = () => {
    if (!scannedData) return null;

    return (
      <SafeAreaView style={STYLES.container}>
        <ScrollView>
          <View style={STYLES.card}>
            <Text style={STYLES.title}>{i18n.t('analysisResult')}</Text>
            
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{i18n.t('generalInfo')}</Text>
              <DataRow label={i18n.t('batch')} value={scannedData.lt} />
              <DataRow label={i18n.t('bacteria')} value={scannedData.bac} />
              <DataRow label={i18n.t('dateTime')} value={new Date(scannedData.ts).toLocaleString(locale)} />
              <DataRow label={i18n.t('employee')} value={scannedData.resp} />
              <DataRow label={i18n.t('duration')} value={formatDuration(scannedData.dur)} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{i18n.t('testResults')}</Text>
              <DataRow label={i18n.t('success')} value={scannedData.suc ? i18n.t('yes') : i18n.t('no')} isSuccess={scannedData.suc} />
              {!scannedData.suc && <DataRow label={i18n.t('errorReason')} value={scannedData.err || 'N/A'} />}
              <DataRow label={i18n.t('tempMaxMin')} value={`${scannedData.tMax}°C / ${scannedData.tMin}°C`} />
              <DataRow label={i18n.t('co2MaxMin')} value={`${scannedData.co2Max} ppm / ${scannedData.co2Min} ppm`} />
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>{i18n.t('antibioticsAnalysis')}</Text>
              <Text style={[styles.label, { marginTop: 10 }]}>{i18n.t('halosSize')}</Text>
              {scannedData.halos.length === 0 ? (
                <Text style={styles.value}>{i18n.t('noHaloData')}</Text>
              ) : (
                scannedData.halos.map((h, i) => (
                  <Text key={`halo-item-${i}`} style={styles.valueListItem}>
                    • {h.nome}: {h.diametro_halo !== null ? `${h.diametro_halo} mm` : 'N/A'}
                  </Text>
                ))
              )}
            </View>
          </View>

          <TouchableOpacity style={[STYLES.button, { marginTop: 20, marginBottom: 40 }]} onPress={handleScanAgain}>
            <Text style={STYLES.buttonText}>{i18n.t('scanAgain')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  };

  return scannedData ? renderScannedData() : (
    <CameraView
      style={StyleSheet.absoluteFillObject}
      barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
      onBarcodeScanned={scannedData ? undefined : handleBarCodeScanned}
    />
  );
}

// ... (o restante do arquivo styles permanece o mesmo)
const styles = StyleSheet.create({
    permissionContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: 20,
      backgroundColor: COLORS.background,
    },
    section: {
      marginBottom: 20,
      borderTopWidth: 1,
      borderTopColor: COLORS.lightGray,
      paddingTop: 15,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: COLORS.primary,
      marginBottom: 10,
    },
    dataRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
    },
    label: {
      fontSize: 16,
      color: COLORS.textSecondary,
      fontWeight: '600',
    },
    value: {
      fontSize: 16,
      color: COLORS.text,
      textAlign: 'right',
      flexShrink: 1,
    },
    valueListItem: {
      fontSize: 16,
      color: COLORS.text,
      marginLeft: 10,
      lineHeight: 24,
    }
  });