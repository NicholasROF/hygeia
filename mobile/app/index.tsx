// Importações necessárias do React e React Native
import React, { useContext } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image } from "react-native";
// Sistema de navegação do Expo Router
import { router } from 'expo-router';
// Estilos e cores padronizados da aplicação
import { STYLES, COLORS } from "../src/styles";
// Sistema de internacionalização
import i18n from '../src/config/i18n';
// Componente para trocar idioma
import { LanguageSwitcher } from '../src/components/languageSwitcher';
// Contexto global de idioma
import { LanguageContext } from '../src/context/LanguageContext';

// TELA PRINCIPAL (HOME) DA APLICAÇÃO
// Primeira tela que o usuário vê, com logo, mensagem de boas-vindas e botão de ação
export default function Index() {
  // ACESSO AO CONTEXTO DE IDIOMA
  // Obtém o idioma atual para garantir sincronização
  const { locale } = useContext(LanguageContext);
  
  // SINCRONIZAÇÃO ADICIONAL DO i18n
  // Embora o _layout.tsx já faça isso, é uma segurança extra
  // para garantir que esta tela sempre use o idioma correto
  i18n.locale = locale;
  
  // FUNÇÃO DE NAVEGAÇÃO PARA O SCANNER
  const navigateToScanner = () => {
    router.push('/leitor'); // Navega para a tela do scanner (app/leitor.tsx)
  };
  
  // RENDERIZAÇÃO DA TELA
  return (
    <View style={[STYLES.container, localStyles.container]}>
      
      {/* LOGO DA APLICAÇÃO */}
      {/* Imagem circular do projeto HYGEIA */}
      <Image 
        source={require('../assets/images/hygeia.png')} 
        style={localStyles.logo}
        resizeMode="cover" // Garante que a imagem preencha o espaço
      />
    
      {/* MENSAGEM DE BOAS-VINDAS */}
      {/* Texto explicativo traduzido sobre a funcionalidade da app */}
      <Text style={STYLES.subtitle}>
        {i18n.t('welcomeMessage')}
      </Text>
      
      {/* BOTÃO PRINCIPAL DE AÇÃO */}
      {/* Botão que leva o usuário para a tela do scanner */}
      <TouchableOpacity 
        style={STYLES.button} 
        onPress={navigateToScanner}
        activeOpacity={0.8} // Efeito visual ao tocar
      >
        <Text style={STYLES.buttonText}>
          {i18n.t('startScanner')}
        </Text>
      </TouchableOpacity>

      {/* SELETOR DE IDIOMA */}
      {/* Componente flutuante para alternar entre português e inglês */}
      <LanguageSwitcher />
    </View>
  );
}

// ESTILOS ESPECÍFICOS DESTA TELA
const localStyles = StyleSheet.create({
  // Container principal com centralização
  container: {
    flex: 1, // Ocupa toda a tela
    justifyContent: "center", // Centraliza verticalmente
    alignItems: "center", // Centraliza horizontalmente
  },
  // Estilo do logo
  logo: {
    width: 120, // Largura fixa
    height: 120, // Altura fixa (quadrado)
    borderRadius: 60, // Bordas arredondadas (círculo perfeito)
    marginBottom: 30, // Espaço abaixo do logo
    backgroundColor: COLORS.lightGray, // Cor de fundo caso a imagem não carregue
  },
});