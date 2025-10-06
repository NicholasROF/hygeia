// Importações necessárias do React e bibliotecas externas
import React, { createContext, useState, useEffect, ReactNode } from 'react';
// AsyncStorage para persistência de dados no dispositivo
import AsyncStorage from '@react-native-async-storage/async-storage';
// Instância configurada do sistema de internacionalização
import i18n from '../config/i18n';

// INTERFACE DO CONTEXTO DE IDIOMA
// Define a estrutura de dados que será compartilhada globalmente
interface LanguageContextType {
  locale: string; // Idioma atual (ex: 'pt', 'en')
  setLocale: (locale: string) => void; // Função para alterar o idioma
}

// CRIAÇÃO DO CONTEXTO GLOBAL
// Context API do React para compartilhar estado do idioma entre componentes
export const LanguageContext = createContext<LanguageContextType>({
  locale: 'pt', // Valor padrão inicial
  setLocale: () => {}, // Função vazia como placeholder
});

// PROVEDOR DO CONTEXTO DE IDIOMA
// Componente que envolve a aplicação e fornece o estado global do idioma
export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  // Estado local para armazenar o idioma atual
  const [locale, setLocaleState] = useState('pt');

  // EFEITO DE INICIALIZAÇÃO
  // Executa uma vez quando o componente é montado
  useEffect(() => {
    // Função assíncrona para carregar idioma salvo
    const loadLocale = async () => {
      try {
        // Tenta recuperar o idioma salvo anteriormente pelo usuário
        const savedLocale = await AsyncStorage.getItem('user-locale');
        
        if (savedLocale) {
          // Se encontrou um idioma salvo, usa ele
          i18n.locale = savedLocale; // Atualiza a instância do i18n
          setLocaleState(savedLocale); // Atualiza o estado local
        } else {
          // Se não encontrou, usa português como padrão
          i18n.locale = 'pt';
          setLocaleState('pt');
        }
      } catch (error) {
        // Em caso de erro, usa português como fallback
        console.log('Erro ao carregar idioma salvo:', error);
        i18n.locale = 'pt';
        setLocaleState('pt');
      }
    };
    
    // Executa a função de carregamento
    loadLocale();
  }, []); // Array vazio significa que executa apenas uma vez

  // FUNÇÃO PARA ALTERAR IDIOMA
  // Função assíncrona que atualiza o idioma em todos os lugares necessários
  const setLocale = async (newLocale: string) => {
    try {
      // 1. Atualiza a instância do i18n (para traduções imediatas)
      i18n.locale = newLocale;
      
      // 2. Atualiza o estado local (para re-renderizar componentes)
      setLocaleState(newLocale);
      
      // 3. Salva a preferência no armazenamento local (persistência)
      await AsyncStorage.setItem('user-locale', newLocale);
    } catch (error) {
      console.log('Erro ao salvar idioma:', error);
    }
  };

  // RENDERIZAÇÃO DO PROVEDOR
  // Fornece o valor do contexto para todos os componentes filhos
  return (
    <LanguageContext.Provider value={{ locale, setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
};