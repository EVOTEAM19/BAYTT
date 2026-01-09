// Script para limpiar la caché de Next.js/Turbopack
const fs = require('fs');
const path = require('path');

function removeDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    return;
  }

  try {
    fs.readdirSync(dirPath).forEach((file) => {
      const curPath = path.join(dirPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        removeDir(curPath);
      } else {
        try {
          fs.unlinkSync(curPath);
        } catch (err) {
          // Ignorar archivos bloqueados
        }
      }
    });
    fs.rmdirSync(dirPath);
  } catch (err) {
    // Ignorar errores si el directorio no está vacío o está bloqueado
  }
}

console.log('🧹 Limpiando caché de Next.js/Turbopack...');

// Limpiar .next
const nextDir = path.join(process.cwd(), '.next');
if (fs.existsSync(nextDir)) {
  try {
    removeDir(nextDir);
    console.log('✅ Caché .next eliminada');
  } catch (err) {
    console.log('⚠️ No se pudo eliminar completamente .next (puede que el servidor esté corriendo)');
  }
} else {
  console.log('ℹ️ No hay caché .next');
}

// Limpiar .turbo
const turboDir = path.join(process.cwd(), '.turbo');
if (fs.existsSync(turboDir)) {
  try {
    removeDir(turboDir);
    console.log('✅ Caché .turbo eliminada');
  } catch (err) {
    console.log('⚠️ No se pudo eliminar completamente .turbo');
  }
} else {
  console.log('ℹ️ No hay caché .turbo');
}

console.log('✨ Limpieza completada');
