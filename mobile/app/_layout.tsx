// Importações necessárias do React e bibliotecas de navegação
import React, { useContext } from 'react';
import { Stack } from "expo-router"; // Sistema de navegação baseado em arquivos
import { COLORS } from "../src/styles"; // Paleta de cores da aplicação
import i18n from '../src/config/i18n'; // Sistema de internacionalização
import { LanguageProvider, LanguageContext } from "../src/context/LanguageContext";

// COMPONENTE DE NAVEGAÇÃO PRINCIPAL
// Configura a estrutura de navegação e aplica o tema visual
function AppStack() {
  // ACESSO AO CONTEXTO DE IDIOMA
  // Obtém o idioma atual para sincronizar com o sistema de tradução
  const { locale } = useContext(LanguageContext);
  
  // SINCRONIZAÇÃO DO SISTEMA DE TRADUÇÃO
  // Garante que a instância do i18n sempre use o idioma correto
  // Isso é crucial para que i18n.t() retorne as traduções no idioma atual
  i18n.locale = locale;

  return (
    <Stack
      // CHAVE DE RE-RENDERIZAÇÃO INTELIGENTE
      // A prop 'key' é fundamental: quando o idioma muda, o React
      // desmonta completamente o Stack e todos os seus filhos,
      // forçando uma re-renderização completa com o novo idioma.
      // Sem isso, os títulos das telas não seriam atualizados imediatamente.
      key={locale}
      
      // CONFIGURAÇÕES VISUAIS GLOBAIS DO HEADER
      screenOptions={{
        // Estilo do cabeçalho
        headerStyle: {
          backgroundColor: COLORS.primary, // Fundo vermelho escuro
        },
        headerTintColor: COLORS.accent, // Cor dos ícones e texto (branco)
        headerTitleStyle: {
          fontWeight: 'bold', // Título em negrito
        },
        headerTitleAlign: 'center', // Título centralizado
      }}
    >
      {/* TELA PRINCIPAL (HOME) */}
      <Stack.Screen 
        name="index" // Nome do arquivo: app/index.tsx
        options={{ title: i18n.t('homeTitle') }} // Título traduzido
      />
      
      {/* TELA DO SCANNER DE QR CODE */}
      <Stack.Screen 
        name="leitor" // Nome do arquivo: app/leitor.tsx
        options={{ title: i18n.t('scannerTitle') }} // Título traduzido
      />
    </Stack>
  );
}

// COMPONENTE RAIZ DA APLICAÇÃO
// Envolve toda a aplicação com o provedor de contexto de idioma
export default function RootLayout() {
  return (
    // PROVEDOR GLOBAL DE IDIOMA
    // Torna o estado do idioma disponível para toda a aplicação
    <LanguageProvider>
      {/* ESTRUTURA DE NAVEGAÇÃO */}
      <AppStack />
    </LanguageProvider>
  );
}