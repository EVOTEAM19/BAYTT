// ============================================
// BAYTT - API Keys Encryption
// ============================================

import CryptoJS from "crypto-js";

/**
 * Clave de encriptación derivada de SUPABASE_SERVICE_ROLE_KEY
 * Usa los primeros 32 caracteres para AES-256
 */
const ENCRYPTION_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 32) ||
  "default-key-change-in-production";

/**
 * Encripta una API key usando AES
 * @param apiKey - La API key en texto plano
 * @returns La API key encriptada como string
 */
export function encryptApiKey(apiKey: string): string {
  return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
}

/**
 * Desencripta una API key encriptada
 * @param encryptedKey - La API key encriptada
 * @returns La API key en texto plano
 */
export function decryptApiKey(encryptedKey: string): string {
  const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
}

/**
 * Enmascara una API key para mostrarla de forma segura
 * Muestra solo los primeros 4 y últimos 4 caracteres
 * @param apiKey - La API key a enmascarar
 * @returns La API key enmascarada (ej: "sk_l****abcd")
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) return "****";
  return apiKey.slice(0, 4) + "****" + apiKey.slice(-4);
}
