// Coloque aqui a data e hora limite
// Obs.: janeiro = 0, fevereiro = 1 ...
export const GLOBAL_DEADLINE = new Date(2026, 2, 20, 23, 59, 59); // 20 de Maio de 2026

/**
 * Função utilitária para saber se o prazo ainda está ativo
 * @returns true se ainda pode editar/criar, false se expirou
 */
export const isSystemOpen = () => {
  const agora = new Date();
  return agora < GLOBAL_DEADLINE;
};