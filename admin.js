// Variables globales
let formulario = null;
let camposFormulario = {};
let siguienteId = 1;

// Configuración (debe coincidir con app.js)
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbzlZQqMIp9aP48uWFGpYPqxLo01hbc1-e-Qgd2RhGffdmOgA9btKVemJHW0UwSth-yN5g/exec'; // Pega aquí la misma URL que en app.js
const USE_GOOGLE_SHEETS = GOOGLE_SHEETS_API && GOOGLE_SHEETS_API.trim() !== '';

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    inicializarFormulario();
    cargarProximoId();
    configurarEventos();
});

// Cargar el próximo ID disponible desde Google Sheets o muebles.json
async function cargarProximoId() {
    try {
        let muebles = [];
        
        // Intentar cargar desde Google Sheets primero
        if (USE_GOOGLE_SHEETS) {
            try {
                const response = await fetch(GOOGLE_SHEETS_API);
                if (response.ok) {
                    const result = await response.json();
                    if (result.success && result.data) {
                        muebles = result.data;
                        console.log('✅ IDs cargados desde Google Sheets');
                    }
                }
            } catch (error) {
                console.log('No se pudo cargar desde Google Sheets, intentando JSON...');
            }
        }
        
        // Si no hay datos de Sheets, intentar JSON
        if (muebles.length === 0) {
            try {
                const response = await fetch('muebles.json');
                if (response.ok) {
                    muebles = await response.json();
                    console.log('✅ IDs cargados desde muebles.json');
                }
            } catch (error) {
                console.log('No se pudo cargar muebles.json');
            }
        }
        
        // Calcular el siguiente ID
        if (muebles && muebles.length > 0) {
            const maxId = Math.max(...muebles.map(m => m.id));
            siguienteId = maxId + 1;
        } else {
            siguienteId = 1;
        }
        
    } catch (error) {
        console.log('Error al cargar IDs, iniciando en 1');
        siguienteId = 1;
    }
    
    // Asignar el ID al campo
    camposFormulario.id.value = siguienteId;
    camposFormulario.id.placeholder = `ID: ${siguienteId}`;
}

// Configurar referencias del formulario
function inicializarFormulario() {
    formulario = document.getElementById('muebleForm');
    camposFormulario = {
        id: document.getElementById('id'),
        nombre: document.getElementById('nombre'),
        categoria: document.getElementById('categoria'),
        precio: document.getElementById('precio'),
        descripcion: document.getElementById('descripcion'),
        imagenes: document.getElementById('imagenes'),
        videos: document.getElementById('videos')
    };
}

// Configurar eventos
function configurarEventos() {
    // Eventos de entrada para actualizar vista previa en tiempo real
    Object.values(camposFormulario).forEach(campo => {
        campo.addEventListener('input', actualizarVistaPrevia);
        campo.addEventListener('change', actualizarVistaPrevia);
    });

    // Evento del botón generar
    document.getElementById('generarBtn').addEventListener('click', generarCodigoJSON);

    // Evento del botón copiar
    document.getElementById('copiarBtn').addEventListener('click', copiarAlPortapapeles);
}

// Actualizar vista previa en tiempo real
function actualizarVistaPrevia() {
    const values = obtenerValoresFormulario();
    
    // Iconos por categoría
    const iconoCategoria = {
        'Sala': '🛋️',
        'Comedor': '🍽️',
        'Dormitorio': '🛏️',
        'Oficina': '💼',
        'Almacenamiento': '📚'
    };
    
    // Actualizar nombre
    const nombreElement = document.querySelector('.vista-previa .mueble-nombre');
    nombreElement.textContent = values.nombre || 'Nombre del Mueble';

    // Actualizar categoría
    const categoriaElement = document.querySelector('.vista-previa .categoria-badge');
    if (values.categoria) {
        categoriaElement.textContent = `${iconoCategoria[values.categoria] || '📦'} ${values.categoria}`;
    } else {
        categoriaElement.textContent = '📦 Categoría';
    }

    // Actualizar descripción
    const descripcionElement = document.querySelector('.vista-previa .mueble-descripcion');
    descripcionElement.textContent = values.descripcion || 'La descripción aparecerá aquí...';

    // Actualizar precio
    const precioElement = document.querySelector('.vista-previa .mueble-precio');
    const precioFormateado = values.precio ? formatearPrecio(parseFloat(values.precio)) : '0.00';
    precioElement.textContent = `$${precioFormateado}`;

    // Actualizar media (imagen)
    actualizarMediaPreview(values);
}

// Actualizar elemento de media en la vista previa
function actualizarMediaPreview(values) {
    const mediaContainer = document.querySelector('.vista-previa .mueble-media');
    const categoriaElement = mediaContainer.querySelector('.categoria-badge');
    const categoriaHTML = categoriaElement ? categoriaElement.outerHTML : '';
    
    if (values.imagenes && values.imagenes.trim() !== '') {
        const primeraImagen = values.imagenes.split(',')[0].trim();
        mediaContainer.innerHTML = `
            <img src="imagenes/${primeraImagen}" alt="${values.nombre}" 
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
            <div class="placeholder-media" style="display: none;">
                <span>📷</span>
                <p>Imagen: ${primeraImagen}</p>
            </div>
            ${categoriaHTML}
        `;
    } else {
        mediaContainer.innerHTML = `
            <div class="placeholder-media">
                <span>📷</span>
                <p>La imagen aparecerá aquí</p>
            </div>
            ${categoriaHTML}
        `;
    }
}

// Obtener valores del formulario
function obtenerValoresFormulario() {
    return {
        id: camposFormulario.id.value,
        nombre: camposFormulario.nombre.value,
        categoria: camposFormulario.categoria.value,
        precio: camposFormulario.precio.value,
        descripcion: camposFormulario.descripcion.value,
        imagenes: camposFormulario.imagenes.value,
        videos: camposFormulario.videos.value
    };
}

// Formatear precio con separadores de miles
function formatearPrecio(precio) {
    return precio.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Generar código JSON
function generarCodigoJSON() {
    // Validar formulario
    if (!formulario.checkValidity()) {
        formulario.reportValidity();
        return;
    }

    const values = obtenerValoresFormulario();

    // Procesar imágenes (sin prefijo, solo nombres separados por comas)
    const imagenesLimpio = values.imagenes
        .split(',')
        .map(img => img.trim())
        .filter(img => img !== '')
        .join(',');

    // Procesar videos (sin prefijo, solo nombres separados por comas)
    const videosLimpio = values.videos
        ? values.videos.split(',')
            .map(vid => vid.trim())
            .filter(vid => vid !== '')
            .join(',')
        : '';

    // Crear fila TSV (tab-separated values) para Google Sheets
    // Formato: ID\tNombre\tCategoria\tPrecio\tDescripcion\tImagenes\tVideos
    const filaTSV = [
        values.id,
        values.nombre.trim(),
        values.categoria,
        values.precio,
        values.descripcion.trim(),
        imagenesLimpio,
        videosLimpio
    ].join('\t');

    // Mostrar en el textarea
    const codigoTextarea = document.getElementById('codigoGenerado');
    codigoTextarea.value = filaTSV;

    // Mostrar sección de código
    const codigoSection = document.getElementById('codigoSection');
    codigoSection.style.display = 'block';

    // Scroll suave a la sección de código
    setTimeout(() => {
        codigoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // Resetear botón copiar
    const copiarBtn = document.getElementById('copiarBtn');
    copiarBtn.textContent = '📋 Copiar al Portapapeles';
    copiarBtn.classList.remove('copiado');
    
    // Preparar para el siguiente mueble
    prepararSiguienteMueble();
}

// Preparar formulario para el siguiente mueble
function prepararSiguienteMueble() {
    // Incrementar el ID para el próximo mueble
    siguienteId++;
    
    // Limpiar campos excepto ID
    camposFormulario.nombre.value = '';
    camposFormulario.categoria.value = '';
    camposFormulario.precio.value = '';
    camposFormulario.descripcion.value = '';
    camposFormulario.imagenes.value = '';
    camposFormulario.videos.value = '';
    
    // Actualizar el ID
    camposFormulario.id.value = siguienteId;
    camposFormulario.id.placeholder = `ID: ${siguienteId}`;
    
    // Actualizar vista previa
    actualizarVistaPrevia();
    
    // Mostrar notificación
    mostrarNotificacion('✅ Listo para agregar el siguiente mueble (ID: ' + siguienteId + ')');
}

// Mostrar notificación temporal
function mostrarNotificacion(mensaje) {
    // Crear elemento de notificación si no existe
    let notif = document.getElementById('notificacionAdmin');
    if (!notif) {
        notif = document.createElement('div');
        notif.id = 'notificacionAdmin';
        notif.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: #4CAF50;
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-weight: 500;
            animation: slideIn 0.3s ease;
        `;
        document.body.appendChild(notif);
        
        // Agregar animación
        const style = document.createElement('style');
        style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(400px); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }
    
    notif.textContent = mensaje;
    notif.style.display = 'block';
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
        notif.style.display = 'none';
    }, 3000);
}

// Copiar código al portapapeles
async function copiarAlPortapapeles() {
    const codigoTextarea = document.getElementById('codigoGenerado');
    const copiarBtn = document.getElementById('copiarBtn');

    try {
        // Seleccionar el texto
        codigoTextarea.select();
        codigoTextarea.setSelectionRange(0, 99999); // Para móviles

        // Copiar al portapapeles (método moderno)
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(codigoTextarea.value);
        } else {
            // Método alternativo para navegadores antiguos
            document.execCommand('copy');
        }

        // Feedback visual
        copiarBtn.textContent = '✅ ¡Copiado!';
        copiarBtn.classList.add('copiado');

        // Restaurar texto después de 3 segundos
        setTimeout(() => {
            copiarBtn.textContent = '📋 Copiar al Portapapeles';
            copiarBtn.classList.remove('copiado');
        }, 3000);

    } catch (err) {
        console.error('Error al copiar:', err);
        copiarBtn.textContent = '❌ Error al copiar';
        
        setTimeout(() => {
            copiarBtn.textContent = '📋 Copiar al Portapapeles';
        }, 3000);
    }
}
