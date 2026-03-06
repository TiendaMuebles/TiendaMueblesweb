// ==================== CONFIGURACIÓN ====================
// Configuración de WhatsApp (Reemplaza con tu número)
const WHATSAPP_NUMBER = '1234567890'; // Formato: código de país + número (sin +, espacios ni guiones)

// URL de la API de Google Sheets (Pega aquí la URL que te da Google Apps Script)
// Instrucciones en: CONFIGURACION_GOOGLE_SHEETS.txt
const GOOGLE_SHEETS_API = 'https://script.google.com/macros/s/AKfycbzlZQqMIp9aP48uWFGpYPqxLo01hbc1-e-Qgd2RhGffdmOgA9btKVemJHW0UwSth-yN5g/exec'; // Ejemplo: 'https://script.google.com/macros/s/XXXX/exec'

// Fallback: Si no configuras Google Sheets, usará muebles.json
const USE_GOOGLE_SHEETS = GOOGLE_SHEETS_API && GOOGLE_SHEETS_API.trim() !== '';

// ==================== VARIABLES GLOBALES ====================
let mueblesData = [];
let currentIndex = 0;
let currentMueble = null;
let totalMedia = 0;
let categoriaActiva = 'todos';
let terminoBusqueda = '';

// ==================== FUNCIONES DE CARGA ====================
// Mostrar pantalla de carga
function mostrarLoader() {
    const loader = document.getElementById('loadingScreen');
    const catalogo = document.getElementById('catalogoMuebles');
    if (loader) {
        loader.classList.remove('hidden');
        loader.style.display = 'flex';
    }
    if (catalogo) {
        catalogo.style.display = 'none';
    }
}

// Ocultar pantalla de carga
function ocultarLoader() {
    const loader = document.getElementById('loadingScreen');
    const catalogo = document.getElementById('catalogoMuebles');
    if (loader) {
        loader.classList.add('hidden');
        setTimeout(() => {
            loader.style.display = 'none';
        }, 300);
    }
    if (catalogo) {
        catalogo.style.display = 'grid';
    }
}

// ==================== CARGA DE DATOS ====================
// Función para cargar los muebles desde Google Sheets o JSON
async function cargarMuebles() {
    mostrarLoader(); // Mostrar loader al inicio
    
    try {
        if (USE_GOOGLE_SHEETS) {
            // Cargar desde Google Sheets
            await cargarDesdeGoogleSheets();
        } else {
            // Cargar desde muebles.json (método tradicional)
            await cargarDesdeJSON();
        }
    } catch (error) {
        console.error('Error al cargar muebles:', error);
        ocultarLoader(); // Ocultar loader si hay error
        mostrarError();
    }
}

// Cargar desde Google Sheets API
async function cargarDesdeGoogleSheets() {
    try {
        console.log('📊 Cargando desde Google Sheets...');
        const response = await fetch(GOOGLE_SHEETS_API);
        
        if (!response.ok) {
            throw new Error('Error al conectar con Google Sheets');
        }
        
        const result = await response.json();
        
        if (result.success) {
            mueblesData = result.data;
            console.log(`✅ ${result.count} muebles cargados desde Google Sheets`);
            mostrarMuebles(mueblesData);
        } else {
            throw new Error(result.error || 'Error desconocido');
        }
    } catch (error) {
        console.error('❌ Error con Google Sheets:', error);
        console.log('🔄 Intentando cargar desde muebles.json...');
        await cargarDesdeJSON();
    }
}

// Cargar desde archivo JSON local (fallback)
async function cargarDesdeJSON() {
    try {
        console.log('📄 Cargando desde muebles.json...');
        const response = await fetch('muebles.json');
        
        if (!response.ok) {
            throw new Error('Error al cargar muebles.json');
        }
        
        mueblesData = await response.json();
        console.log(`✅ ${mueblesData.length} muebles cargados desde JSON`);
        mostrarMuebles(mueblesData);
    } catch (error) {
        throw error;
    }
}

// Función para mostrar los muebles en el DOM
function mostrarMuebles(muebles) {
    const catalogo = document.getElementById('catalogoMuebles');
    const noResults = document.getElementById('noResults');

    if (muebles.length === 0) {
        catalogo.innerHTML = '';
        noResults.style.display = 'block';
        ocultarLoader(); // Ocultar loader incluso si no hay resultados
        return;
    }

    noResults.style.display = 'none';
    catalogo.innerHTML = muebles.map(mueble => crearTarjetaMueble(mueble)).join('');
    
    // Agregar eventos de clic a las tarjetas
    document.querySelectorAll('.mueble-card').forEach(card => {
        card.addEventListener('click', () => {
            const muebleId = parseInt(card.dataset.id);
            const mueble = mueblesData.find(m => m.id === muebleId);
            if (mueble) {
                abrirModal(mueble);
            }
        });
    });
    
    // Ocultar loader cuando los muebles estén listos
    ocultarLoader();
}

// Función para crear una tarjeta de mueble
function crearTarjetaMueble(mueble) {
    const primeraImagen = mueble.imagenes && mueble.imagenes.length > 0 
        ? mueble.imagenes[0] 
        : 'imagenes/placeholder.jpg';
    
    const totalMedias = (mueble.imagenes?.length || 0) + (mueble.videos?.length || 0);
    const precioFormateado = formatearPrecio(mueble.precio);
    
    // Iconos por categoría
    const iconoCategoria = {
        'Sala': '🛋️',
        'Comedor': '🍽️',
        'Dormitorio': '🛏️',
        'Oficina': '💼',
        'Almacenamiento': '📚'
    };

    return `
        <article class="mueble-card" data-id="${mueble.id}" data-categoria="${mueble.categoria}">
            <div class="mueble-media">
                <img src="${primeraImagen}" alt="${mueble.nombre}">
                ${totalMedias > 1 ? `<span class="media-badge">📸 ${totalMedias} fotos/videos</span>` : ''}
                <span class="categoria-badge">${iconoCategoria[mueble.categoria] || '📦'} ${mueble.categoria}</span>
            </div>
            <div class="mueble-content">
                <h2 class="mueble-nombre">${mueble.nombre}</h2>
                <p class="mueble-descripcion">${mueble.descripcion}</p>
                <div class="mueble-precio">S/.${precioFormateado}</div>
            </div>
        </article>
    `;
}

// Función para formatear el precio
function formatearPrecio(precio) {
    return precio.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// Función para abrir el modal
function abrirModal(mueble) {
    currentMueble = mueble;
    currentIndex = 0;
    
    // Calcular total de medios
    const imagenes = mueble.imagenes || [];
    const videos = mueble.videos || [];
    totalMedia = imagenes.length + videos.length;
    
    // Iconos por categoría
    const iconoCategoria = {
        'Sala': '🛋️',
        'Comedor': '🍽️',
        'Dormitorio': '🛏️',
        'Oficina': '💼',
        'Almacenamiento': '📚'
    };
    
    // Actualizar información del modal
    document.getElementById('modalNombre').textContent = mueble.nombre;
    document.getElementById('modalDescripcion').textContent = mueble.descripcion;
    document.getElementById('modalPrecio').innerHTML = `
        <span class="modal-categoria">${iconoCategoria[mueble.categoria] || '📦'} ${mueble.categoria}</span>
        S/.${formatearPrecio(mueble.precio)}
    `;
    
    // Configurar WhatsApp
    const mensajeWhatsApp = encodeURIComponent(
        `Hola, me interesa el ${mueble.nombre} que vi en el catálogo`
    );
    document.getElementById('modalWhatsapp').href = 
        `https://wa.me/${WHATSAPP_NUMBER}?text=${mensajeWhatsApp}`;
    
    // Crear galería
    crearGaleria(imagenes, videos);
    
    // Mostrar modal
    const modal = document.getElementById('modalGaleria');
    modal.classList.add('active');
    document.body.classList.add('modal-open');
}

// Función para crear la galería
function crearGaleria(imagenes, videos) {
    const galeriaMain = document.getElementById('galeriaMain');
    const indicadores = document.getElementById('galeriaIndicadores');
    
    // Limpiar contenido anterior
    galeriaMain.innerHTML = '';
    indicadores.innerHTML = '';
    
    // Crear items de la galería
    let index = 0;
    
    // Agregar imágenes
    imagenes.forEach((imagen, i) => {
        const item = document.createElement('div');
        item.className = `galeria-item ${i === 0 ? 'active' : ''}`;
        item.innerHTML = `<img src="${imagen}" alt="${currentMueble.nombre}">`;
        galeriaMain.appendChild(item);
        
        // Crear indicador
        const indicador = document.createElement('button');
        indicador.className = `indicador ${i === 0 ? 'active' : ''}`;
        indicador.setAttribute('aria-label', `Ir a imagen ${i + 1}`);
        indicador.addEventListener('click', () => irASlide(i));
        indicadores.appendChild(indicador);
        
        index++;
    });
    
    // Agregar videos
    videos.forEach((video, i) => {
        const item = document.createElement('div');
        const isActive = imagenes.length === 0 && i === 0;
        item.className = `galeria-item ${isActive ? 'active' : ''}`;
        
        // Detectar si es video de Google Drive (formato /preview)
        if (video.includes('drive.google.com') && video.includes('/preview')) {
            // Usar iframe para videos de Drive
            item.innerHTML = `
                <iframe 
                    src="${video}" 
                    frameborder="0"
                    allow="autoplay; encrypted-media"
                    allowfullscreen
                    style="width: 100%; height: 100%; min-height: 400px;"
                ></iframe>
            `;
        } else {
            // Usar etiqueta video para archivos locales o Cloudinary
            item.innerHTML = `
                <video controls style="width: 100%; height: auto;">
                    <source src="${video}" type="video/mp4">
                    Tu navegador no soporta el elemento de video.
                </video>
            `;
        }
        
        galeriaMain.appendChild(item);
        
        // Crear indicador
        const indicador = document.createElement('button');
        indicador.className = `indicador ${isActive ? 'active' : ''}`;
        indicador.setAttribute('aria-label', `Ir a video ${i + 1}`);
        indicador.addEventListener('click', () => irASlide(imagenes.length + i));
        indicadores.appendChild(indicador);
    });
    
    // Actualizar botones de navegación
    actualizarBotonesNavegacion();
}

// Función para ir a un slide específico
function irASlide(index) {
    const items = document.querySelectorAll('.galeria-item');
    const indicadores = document.querySelectorAll('.indicador');
    
    // Remover clase active de todos
    items.forEach(item => item.classList.remove('active'));
    indicadores.forEach(ind => ind.classList.remove('active'));
    
    // Pausar videos nativos y recargar iframes de Drive
    items.forEach(item => {
        const video = item.querySelector('video');
        if (video) {
            video.pause();
            video.currentTime = 0;
        }
        
        // Pausar iframes de Drive recargándolos
        const iframe = item.querySelector('iframe');
        if (iframe && iframe.src.includes('drive.google.com')) {
            const currentSrc = iframe.src;
            iframe.src = '';
            iframe.src = currentSrc;
        }
    });
    
    // Agregar clase active al nuevo
    items[index].classList.add('active');
    indicadores[index].classList.add('active');
    
    currentIndex = index;
    actualizarBotonesNavegacion();
}

// Función para navegar al siguiente/anterior
function navegarGaleria(direccion) {
    let nuevoIndex = currentIndex + direccion;
    
    if (nuevoIndex < 0) {
        nuevoIndex = totalMedia - 1;
    } else if (nuevoIndex >= totalMedia) {
        nuevoIndex = 0;
    }
    
    irASlide(nuevoIndex);
}

// Función para actualizar botones de navegación
function actualizarBotonesNavegacion() {
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    
    // Mostrar/ocultar botones si solo hay un item
    if (totalMedia <= 1) {
        btnPrev.style.display = 'none';
        btnNext.style.display = 'none';
    } else {
        btnPrev.style.display = 'flex';
        btnNext.style.display = 'flex';
    }
}

// Función para cerrar el modal
function cerrarModal() {
    const modal = document.getElementById('modalGaleria');
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
    
    // Pausar todos los videos nativos
    document.querySelectorAll('.galeria-item video').forEach(video => {
        video.pause();
        video.currentTime = 0;
    });
    
    // Pausar iframes de Drive recargándolos
    document.querySelectorAll('.galeria-item iframe').forEach(iframe => {
        if (iframe.src.includes('drive.google.com')) {
            iframe.src = '';
        }
    });
    
    currentMueble = null;
    currentIndex = 0;
}

// Función de búsqueda en tiempo real
function buscarMuebles(termino) {
    terminoBusqueda = termino.toLowerCase().trim();
    aplicarFiltros();
}

// Función para filtrar por categoría
function filtrarPorCategoria(categoria) {
    categoriaActiva = categoria;
    
    // Actualizar botones activos
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.category === categoria) {
            btn.classList.add('active');
        }
    });
    
    aplicarFiltros();
}

// Función para aplicar filtros combinados
function aplicarFiltros() {
    let resultados = mueblesData;
    
    // Filtrar por categoría
    if (categoriaActiva !== 'todos') {
        resultados = resultados.filter(mueble => mueble.categoria === categoriaActiva);
    }
    
    // Filtrar por búsqueda
    if (terminoBusqueda !== '') {
        resultados = resultados.filter(mueble => 
            mueble.nombre.toLowerCase().includes(terminoBusqueda) ||
            mueble.descripcion.toLowerCase().includes(terminoBusqueda) ||
            mueble.categoria.toLowerCase().includes(terminoBusqueda)
        );
    }
    
    mostrarMuebles(resultados);
}

// Función para mostrar error
function mostrarError() {
    const catalogo = document.getElementById('catalogoMuebles');
    catalogo.innerHTML = `
        <div class="no-results">
            <p>⚠️ Error al cargar el catálogo. Por favor, recarga la página.</p>
        </div>
    `;
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Cargar muebles al inicio
    cargarMuebles();

    // Configurar buscador
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        buscarMuebles(e.target.value);
    });
    
    // Configurar filtros de categoría
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            filtrarPorCategoria(btn.dataset.category);
        });
    });
    
    // Configurar botón cerrar modal
    document.getElementById('closeModal').addEventListener('click', cerrarModal);
    
    // Cerrar modal al hacer clic en el overlay
    document.getElementById('modalGaleria').addEventListener('click', (e) => {
        if (e.target.id === 'modalGaleria') {
            cerrarModal();
        }
    });
    
    // Configurar botones de navegación
    document.getElementById('btnPrev').addEventListener('click', () => navegarGaleria(-1));
    document.getElementById('btnNext').addEventListener('click', () => navegarGaleria(1));
    
    // Navegación con teclado
    document.addEventListener('keydown', (e) => {
        const modal = document.getElementById('modalGaleria');
        if (!modal.classList.contains('active')) return;
        
        if (e.key === 'Escape') {
            cerrarModal();
        } else if (e.key === 'ArrowLeft') {
            navegarGaleria(-1);
        } else if (e.key === 'ArrowRight') {
            navegarGaleria(1);
        }
    });
    
    // === SISTEMA DE LOGIN ===
    const CREDENCIALES = {
        usuario: 'admin',
        password: 'admin123'
    };
    
    const modalLogin = document.getElementById('modalLogin');
    const btnAdmin = document.getElementById('btnAdmin');
    const closeLogin = document.getElementById('closeLogin');
    const formLogin = document.getElementById('formLogin');
    const loginError = document.getElementById('loginError');
    
    // Abrir modal de login
    btnAdmin.addEventListener('click', (e) => {
        e.preventDefault();
        modalLogin.classList.add('active');
        document.body.classList.add('modal-open');
        document.getElementById('loginUsuario').focus();
        // Limpiar formulario
        formLogin.reset();
        loginError.style.display = 'none';
    });
    
    // Cerrar modal de login
    closeLogin.addEventListener('click', () => {
        modalLogin.classList.remove('active');
        document.body.classList.remove('modal-open');
        formLogin.reset();
        loginError.style.display = 'none';
    });
    
    // Cerrar modal al hacer clic fuera
    modalLogin.addEventListener('click', (e) => {
        if (e.target.id === 'modalLogin') {
            modalLogin.classList.remove('active');
            document.body.classList.remove('modal-open');
            formLogin.reset();
            loginError.style.display = 'none';
        }
    });
    
    // Manejar submit del formulario
    formLogin.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const usuario = document.getElementById('loginUsuario').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        // Validar credenciales
        if (usuario === CREDENCIALES.usuario && password === CREDENCIALES.password) {
            // Login exitoso
            loginError.style.display = 'none';
            modalLogin.classList.remove('active');
            document.body.classList.remove('modal-open');
            
            // Redirigir al panel de admin
            window.location.href = 'admin.html';
        } else {
            // Credenciales incorrectas
            loginError.style.display = 'block';
            document.getElementById('loginPassword').value = '';
            document.getElementById('loginPassword').focus();
            
            // Shake animation
            formLogin.style.animation = 'shake 0.5s';
            setTimeout(() => {
                formLogin.style.animation = '';
            }, 500);
        }
    });
    
    // === NAVEGACIÓN SUAVE ===
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const href = link.getAttribute('href');
            
            // Solo aplicar scroll suave a enlaces internos (no al login)
            if (href.startsWith('#') && href !== '#' && link.id !== 'btnAdmin') {
                e.preventDefault();
                
                // Actualizar estado activo
                document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                link.classList.add('active');
                
                // Scroll suave
                const targetId = href.substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    const offset = 80; // Altura del navbar
                    const elementPosition = targetElement.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - offset;
                    
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            }
        });
    });
});

// Añadir animación de shake al CSS (si no existe)
const style = document.createElement('style');
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);

