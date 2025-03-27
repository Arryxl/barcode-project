// Variable global para el temporizador
let productResetTimer = null;

document.addEventListener('DOMContentLoaded', function() {
    let scanBuffer = '';
    let lastScanTime = 0;
    const SCAN_TIMEOUT = 50;

    document.addEventListener('keydown', function(event) {
        const currentTime = new Date().getTime();

        if (currentTime - lastScanTime > SCAN_TIMEOUT && scanBuffer.length > 0) {
            scanBuffer = '';
        }

        lastScanTime = currentTime;

        if (event.key === 'Enter') {
            if (scanBuffer.length > 0) {
                event.preventDefault();
                procesarCodigoEscaneado(scanBuffer);
                scanBuffer = '';
            }
        } 
        else if (event.key.length === 1) {
            scanBuffer += event.key;
        }
    });

    // Añade un icono de escáner animado al mensaje inicial con línea de escaneo
    const mensajeInicial = document.querySelector('.fullscreen-message');
    if (mensajeInicial) {
        mensajeInicial.innerHTML = `
            <div class="scanner-container">
                <div class="scan-line"></div>
            </div>
            <div>Verificador de precios</div>
        `;
    }
});

function procesarCodigoEscaneado(codigo) {
    console.log('Código escaneado:', codigo);
    
    // Cancelar cualquier temporizador activo
    if (productResetTimer) {
        clearTimeout(productResetTimer);
        productResetTimer = null;
    }
    
    // Añadir efecto de escaneo
    const mensajeExistente = document.querySelector('.fullscreen-message');
    if (mensajeExistente) {
        mensajeExistente.innerHTML = `
            <div class="scanner-container">
                <div class="scan-line"></div>
            </div>
            <div>Procesando código...</div>
        `;
    }
    
    fetch(`http://localhost:3000/api/allproductos?codigo=${codigo}`)
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
    })
    .then(productos => {
        if (productos && productos.length > 0) {
            mostrarProductoPantallaCompleta(productos[0]);
        } else {
            mostrarProductoNoEncontradoPantallaCompleta();
        }
    })
    .catch(error => {
        console.error('Error al buscar producto:', error);
        const mensajeExistente = document.querySelector('.fullscreen-message');
        if (mensajeExistente) {
            mensajeExistente.style.display = 'block';
            mensajeExistente.innerHTML = `
                <div class="error-message">Error al buscar el producto</div>
                <div class="error-description">Intente nuevamente o contacte con soporte técnico.</div>
            `;
        }
       
        const productContainer = document.getElementById('product-container');
        if (productContainer) {
            productContainer.innerHTML = '';
        }
        
        // Asegúrate de quitar la clase product-active
        document.body.classList.remove('product-active');
    });
}

function salirModoPantallaCompleta() {
    const prevUrl = localStorage.getItem('prevUrl') || '/index.html';
    window.location.href = prevUrl;
}

function mostrarProductoPantallaCompleta(producto) {
    console.log(producto);
    
    // Activa el modo producto
    document.body.classList.add('product-active');
    
    const mensajeExistente = document.querySelector('.fullscreen-message');
    if (mensajeExistente) {
        mensajeExistente.style.display = 'none';
    }
    
    const productContainer = document.getElementById('product-container');
    productContainer.innerHTML = '';
    
    const productoElement = document.createElement('div');
    productoElement.className = 'fullscreen-product product-animation';
    
    productoElement.innerHTML = `
        <div class="codigo">Código: ${producto.Barras}</div>
        <div class="nombre">${producto.Descripcion || ''}</div>
        <div class="precio">$${producto.Precio.toLocaleString('es-ES')}.00</div>
    `;
    
    productContainer.appendChild(productoElement);
    
    // Pequeño retraso para que se active la transición
    setTimeout(() => {
        const product = document.querySelector('.fullscreen-product');
        if (product) {
            product.style.opacity = '1';
            product.style.transform = 'translate(-50%, -50%) translateY(0)';
        }
    }, 50);
    
    // Configurar temporizador para revertir al estado inicial después de 5 segundos
    if (productResetTimer) {
        clearTimeout(productResetTimer);
    }
    
    productResetTimer = setTimeout(() => {
        reverterAEstadoInicial();
    }, 5000);
}

function mostrarProductoNoEncontradoPantallaCompleta() {
    // Remover clase de producto activo
    document.body.classList.remove('product-active');
    
    const mensajeExistente = document.querySelector('.fullscreen-message');
    if (mensajeExistente) {
        mensajeExistente.style.display = 'block';
        mensajeExistente.innerHTML = `
            <div style="font-size: 56px; margin-bottom: 20px;">⚠️</div>
            <div class="error-message">Producto no encontrado</div>
            <div class="error-description">
                El código escaneado no corresponde a ningún producto registrado.
            </div>
        `;
    }
    
    const productContainer = document.getElementById('product-container');
    if (productContainer) {
        productContainer.innerHTML = '';
    }
    
    const audio = new Audio('/sounds/beep-error.mp3');
    audio.play().catch(e => console.log('No se pudo reproducir el sonido'));
    
    // Configurar temporizador para revertir al estado inicial después de 5 segundos
    if (productResetTimer) {
        clearTimeout(productResetTimer);
    }
    
    productResetTimer = setTimeout(() => {
        reverterAEstadoInicial();
    }, 5000);
}

function reverterAEstadoInicial() {
    // Aplicar clase de transición de salida
    const productElement = document.querySelector('.fullscreen-product');
    if (productElement) {
        productElement.classList.add('fade-out');
        
        // Esperar a que termine la animación
        setTimeout(() => {
            // Eliminar clase de producto activo
            document.body.classList.remove('product-active');
            
            // Mostrar mensaje inicial
            const mensajeExistente = document.querySelector('.fullscreen-message');
            if (mensajeExistente) {
                mensajeExistente.style.display = 'block';
                mensajeExistente.innerHTML = `
                    <div class="scanner-container">
                        <div class="scan-line"></div>
                    </div>
                    <div>Verificador de precios</div>
                `;
            }
            
            // Limpiar contenedor de producto
            const productContainer = document.getElementById('product-container');
            if (productContainer) {
                productContainer.innerHTML = '';
            }
        }, 600);
    } else {
        // Si no hay producto, simplemente restaurar el mensaje inicial
        document.body.classList.remove('product-active');
        
        const mensajeExistente = document.querySelector('.fullscreen-message');
        if (mensajeExistente) {
            mensajeExistente.style.display = 'block';
            mensajeExistente.innerHTML = `
                <div class="scanner-container">
                    <div class="scan-line"></div>
                </div>
                <div>Verificador de precios</div>
            `;
        }
    }
}