/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  GOOGLE APPS SCRIPT - API PARA CATÁLOGO DE MUEBLES              ║
 * ║  Este código convierte tu Google Sheet en una API JSON          ║
 * ║  CON SOPORTE PARA GITHUB PAGES (CORS HABILITADO)                ║
 * ╚══════════════════════════════════════════════════════════════════╝
 * 
 * INSTRUCCIONES:
 * 1. Abre tu Google Sheet
 * 2. Ve a: Extensiones > Apps Script
 * 3. Borra todo el código que aparece
 * 4. Copia y pega TODO este archivo
 * 5. Haz clic en "Implementar" > "Administrar implementaciones"
 * 6. Edita la implementación activa
 * 7. Selecciona "Nueva versión"
 * 8. Haz clic en "Implementar"
 */

// ==================== CONFIGURACIÓN ====================
// Nombre de la hoja donde están los datos (pestaña del Excel)
const SHEET_NAME = 'Muebles';

// ⚠️ IMPORTANTE: Dominios permitidos para acceder a la API
const ALLOWED_ORIGINS = [
    'https://fer722.github.io',
    'http://localhost',
    'http://127.0.0.1'
];

// ==================== FUNCIÓN PRINCIPAL ====================
/**
 * Esta función se ejecuta cada vez que alguien visita tu web
 * Devuelve todos los muebles en formato JSON
 */
function doGet(e) {
  try {
    // Obtener la hoja de cálculo activa
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = spreadsheet.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return createErrorResponse(`No se encontró la hoja "${SHEET_NAME}"`);
    }
    
    // Leer todos los datos
    const data = sheet.getDataRange().getValues();
    
    // La primera fila son los encabezados
    const headers = data[0];
    
    // Las demás filas son los muebles
    const muebles = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      
      // Si la fila está vacía, saltarla
      if (!row[0]) continue;
      
      // Crear objeto del mueble
      const mueble = {
        id: parseInt(row[0]) || i,
        nombre: String(row[1] || '').trim(),
        categoria: String(row[2] || 'Sala').trim(),
        precio: parseFloat(row[3]) || 0,
        descripcion: String(row[4] || '').trim(),
        imagenes: parseArrayField(row[5], 'imagenes'),
        videos: parseArrayField(row[6], 'videos')
      };
      
      // Solo agregar si tiene al menos nombre e imagen
      if (mueble.nombre && mueble.imagenes.length > 0) {
        muebles.push(mueble);
      }
    }
    
    // Devolver respuesta exitosa CON CORS
    return createSuccessResponse(muebles, e);
    
  } catch (error) {
    return createErrorResponse(error.toString(), e);
  }
}

// ==================== FUNCIONES AUXILIARES ====================

/**
 * Convierte un campo de texto con comas en array
 * Ejemplo: "foto1.jpg, foto2.jpg" → ["imagenes/foto1.jpg", "imagenes/foto2.jpg"]
 */
function parseArrayField(field, prefix) {
  if (!field || field.toString().trim() === '') {
    return [];
  }
  
  // Separar por comas y limpiar espacios
  const items = field.toString()
    .split(',')
    .map(item => item.trim())
    .filter(item => item !== '');
  
  // Agregar prefijo si no lo tiene
  return items.map(item => {
    if (item.startsWith('http')) {
      // Si es una URL completa, devolverla tal cual
      return item;
    } else if (item.startsWith('imagenes/') || item.startsWith('videos/')) {
      // Si ya tiene el prefijo, devolverla tal cual
      return item;
    } else {
      // Si no, agregar el prefijo
      return `${prefix}/${item}`;
    }
  });
}

/**
 * Obtener el origen de la petición y verificar si está permitido
 */
function getAllowedOrigin(e) {
  if (!e || !e.parameter) {
    return ALLOWED_ORIGINS[0]; // Devolver el primero por defecto
  }
  
  const origin = e.parameter.origin || '';
  
  // Verificar si el origen está en la lista de permitidos
  for (let allowedOrigin of ALLOWED_ORIGINS) {
    if (origin.startsWith(allowedOrigin)) {
      return origin;
    }
  }
  
  // Si no está permitido, devolver el primero de la lista
  return ALLOWED_ORIGINS[0];
}

/**
 * Crear respuesta exitosa en formato JSON CON CORS
 */
function createSuccessResponse(data, e) {
  const output = {
    success: true,
    count: data.length,
    data: data,
    timestamp: new Date().toISOString()
  };
  
  const allowedOrigin = getAllowedOrigin(e);
  
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Crear respuesta de error en formato JSON CON CORS
 */
function createErrorResponse(message, e) {
  const output = {
    success: false,
    error: message,
    timestamp: new Date().toISOString()
  };
  
  const allowedOrigin = getAllowedOrigin(e);
  
  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader('Access-Control-Allow-Origin', '*')
    .setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .setHeader('Access-Control-Allow-Headers', 'Content-Type')
    .setHeader('Access-Control-Max-Age', '86400');
}

// ==================== FUNCIÓN DE PRUEBA ====================
/**
 * Esta función es solo para probar en el editor de Apps Script
 * No la uses en producción
 */
function testAPI() {
  const result = doGet(null);
  const json = JSON.parse(result.getContent());
  Logger.log(json);
  return json;
}
