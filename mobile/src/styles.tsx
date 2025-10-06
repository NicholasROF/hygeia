// Importação do sistema de estilos do React Native
import { StyleSheet } from 'react-native';

// PALETA DE CORES DO PROJETO HYGEIA
// Cores cuidadosamente selecionadas para transmitir profissionalismo médico/científico
export const COLORS = {
  // CORES PRIMÁRIAS
  primary: '#6A0E1D',        // Vermelho escuro profissional - cor principal da marca
  primaryDark: '#8B0000',    // Variação mais escura para hover/pressed states
  
  // CORES DE CONTRASTE
  accent: '#FFFFFF',         // Branco puro - usado para texto em fundos escuros
  
  // CORES DE TEXTO
  text: '#343A40',          // Cinza escuro - texto principal, alta legibilidade
  textSecondary: '#495057', // Cinza médio - texto secundário, menos destaque
  
  // CORES DE FUNDO
  background: '#F8F9FA',    // Cinza muito claro - fundo principal das telas
  lightGray: '#EAECEF',     // Cinza claro - bordas, separações, fundos sutis
  
  // CORES DE ESTADO
  success: '#27ae60',       // Verde - indica sucesso, resultados positivos
  error: '#DC3545',         // Vermelho - indica erro, falha, resultados negativos
};

// ESTILOS REUTILIZÁVEIS GLOBAIS
// Componentes de estilo padronizados para manter consistência visual em toda a app
export const STYLES = StyleSheet.create({
  // CONTAINER PADRÃO
  // Layout base usado na maioria das telas
  container: {
    flex: 1,                           // Ocupa toda a altura disponível
    backgroundColor: COLORS.background, // Fundo cinza claro
    padding: 20,                       // Espaçamento interno uniforme
  },
  
  // TÍTULO PRINCIPAL
  // Usado para títulos de seções importantes
  title: {
    fontSize: 26,              // Tamanho grande para destaque
    fontWeight: 'bold',        // Negrito para ênfase
    color: COLORS.primary,     // Cor da marca
    textAlign: 'center',       // Centralizado
    marginBottom: 10,          // Espaço abaixo
  },
  
  // SUBTÍTULO/TEXTO EXPLICATIVO
  // Usado para textos descritivos e instruções
  subtitle: {
    fontSize: 16,                 // Tamanho médio, legível
    textAlign: 'center',          // Centralizado
    color: COLORS.textSecondary,  // Cor mais sutil
    marginBottom: 30,             // Espaço generoso abaixo
  },
  
  // BOTÃO PRIMÁRIO
  // Estilo padrão para botões de ação principal
  button: {
    backgroundColor: COLORS.primary,  // Fundo na cor da marca
    paddingVertical: 15,             // Espaçamento vertical interno
    paddingHorizontal: 30,           // Espaçamento horizontal interno
    borderRadius: 8,                 // Bordas levemente arredondadas
    alignItems: 'center',            // Centraliza conteúdo horizontalmente
    justifyContent: 'center',        // Centraliza conteúdo verticalmente
    
    // EFEITOS DE SOMBRA (iOS)
    shadowColor: '#000',             // Cor da sombra
    shadowOffset: { width: 0, height: 2 }, // Deslocamento da sombra
    shadowOpacity: 0.2,              // Opacidade da sombra
    shadowRadius: 4,                 // Raio de desfoque
    
    // EFEITO DE ELEVAÇÃO (Android)
    elevation: 5,                    // Altura da sombra no Material Design
  },
  
  // TEXTO DO BOTÃO
  // Estilo do texto dentro dos botões primários
  buttonText: {
    color: COLORS.accent,     // Branco para contraste com fundo escuro
    fontSize: 18,             // Tamanho legível e destacado
    fontWeight: '600',        // Semi-negrito para ênfase
  },
  
  // CARD/CARTÃO
  // Container elevado para agrupar conteúdo relacionado
  card: {
    backgroundColor: COLORS.accent,   // Fundo branco
    borderRadius: 12,                 // Bordas bem arredondadas
    padding: 20,                      // Espaçamento interno generoso
    
    // EFEITOS DE SOMBRA SUAVE (iOS)
    shadowColor: '#000',              // Cor da sombra
    shadowOffset: { width: 0, height: 2 }, // Deslocamento sutil
    shadowOpacity: 0.1,               // Sombra bem sutil
    shadowRadius: 6,                  // Desfoque suave
    
    // EFEITO DE ELEVAÇÃO SUAVE (Android)
    elevation: 4,                     // Elevação moderada
  },
});
