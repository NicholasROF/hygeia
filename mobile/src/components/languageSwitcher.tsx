// Importações necessárias do React e React Native
import React, { useContext } from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
// Contexto global para gerenciamento do idioma
import { LanguageContext } from '../context/LanguageContext';
// Paleta de cores padronizada da aplicação
import { COLORS } from '../styles';

// COMPONENTE SELETOR DE IDIOMA
// Botão flutuante que permite alternar entre português e inglês
export const LanguageSwitcher = () => {
  // ACESSO AO CONTEXTO GLOBAL
  // Obtém o idioma atual e a função para alterá-lo
  const { locale, setLocale } = useContext(LanguageContext);

  // FUNÇÃO DE ALTERNÂNCIA DE IDIOMA
  // Lógica simples: se é português, muda para inglês e vice-versa
  const toggleLanguage = () => {
    const newLocale = locale === 'pt' ? 'en' : 'pt';
    setLocale(newLocale); // Chama a função do contexto para atualizar globalmente
  };

  // DETERMINAÇÃO DO TEXTO E ÍCONE ATUAL
  // Baseado no idioma atual, define o nome e bandeira a serem exibidos
  const currentLanguageName = locale === 'pt' ? 'Português' : 'English';
  const currentLanguageFlag = locale === 'pt' ? '🇧🇷' : '🇺🇸';

  // RENDERIZAÇÃO DO COMPONENTE
  return (
    <TouchableOpacity 
      style={styles.container} 
      onPress={toggleLanguage}
      activeOpacity={0.7} // Efeito visual ao tocar
    >
      {/* Bandeira do país correspondente ao idioma */}
      <Text style={styles.flag}>{currentLanguageFlag}</Text>
      
      {/* Nome do idioma atual */}
      <Text style={styles.text}>{currentLanguageName}</Text>
    </TouchableOpacity>
  );
};

// ESTILOS DO COMPONENTE
const styles = StyleSheet.create({
  // Container principal do botão
  container: {
    flexDirection: 'row', // Alinha bandeira e texto horizontalmente
    justifyContent: 'center', // Centraliza o conteúdo
    alignItems: 'center', // Alinha verticalmente
    backgroundColor: COLORS.accent, // Fundo branco
    borderWidth: 1, // Borda sutil
    borderColor: COLORS.lightGray, // Cor da borda
    borderRadius: 25, // Bordas arredondadas (formato de pílula)
    paddingVertical: 10, // Espaçamento vertical interno
    paddingHorizontal: 20, // Espaçamento horizontal interno
    position: 'absolute', // Posicionamento absoluto
    bottom: 40, // Distância da parte inferior da tela
    // EFEITOS DE SOMBRA (iOS e Android)
    shadowColor: '#000', // Cor da sombra
    shadowOffset: { width: 0, height: 1 }, // Deslocamento da sombra
    shadowOpacity: 0.2, // Opacidade da sombra
    shadowRadius: 2, // Raio de desfoque da sombra
    elevation: 3, // Elevação para Android
  },
  // Estilo da bandeira (emoji)
  flag: {
    fontSize: 18, // Tamanho da bandeira
    marginRight: 8, // Espaço entre bandeira e texto
  },
  // Estilo do texto do idioma
  text: {
    fontSize: 16, // Tamanho da fonte
    color: COLORS.text, // Cor do texto
    fontWeight: '500', // Peso da fonte (semi-negrito)
  },
});