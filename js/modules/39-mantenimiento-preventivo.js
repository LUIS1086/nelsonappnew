/**
 * Módulo de Alertas de Mantenimiento Preventivo y Garantías
 * Todo Repuestos Nelson
 */

// Función para verificar clientes que cumplen tiempo para mantenimiento preventivo (6 meses por defecto)
function verificarMantenimientosPreventivos(mesesIntervalo = 6) {
    const ordenesDB = JSON.parse(localStorage.getItem('taller_ordenes') || '[]');
    const hoy = new Date();
    
    const clientesSugeridos = [];

    ordenesDB.forEach(orden => {
        if (orden.estado === 'entregado' && orden.fechaEntrega) {
            const fechaEntrega = new Date(orden.fechaEntrega);
            const mesesDiferencia = (hoy - fechaEntrega) / (1000 * 60 * 60 * 24 * 30.44);

            if (mesesDiferencia >= mesesIntervalo && !orden.mantenimientoNotificado) {
                clientesSugeridos.push({
                    idOrden: orden.codigo || orden.id,
                    cliente: orden.clienteNombre || 'Cliente',
                    telefono: orden.clienteTelefono || '',
                    electrodomestico: orden.electrodomestico || 'Electrodoméstico',
                    marca: orden.marca || '',
                    fechaEntrega: orden.fechaEntrega,
                    mesesTranscurridos: Math.floor(mesesDiferencia)
                });
            }
        }
    });

    return clientesSugeridos;
}

// Función para generar enlace directo de WhatsApp de mantenimiento preventivo
function generarWhatsAppMantenimiento(clienteObj) {
    const dominioBase = window.location.origin;
    const mensaje = `Hola ${clienteObj.cliente}, te saludamos de *Todo Repuestos Nelson* 🛠️. Hace ${clienteObj.mesesTranscurridos} meses le realizamos mantenimiento a tu ${clienteObj.electrodomestico} ${clienteObj.marca}. Recordamos que para prolongar su vida útil es recomendable un chequeo preventivo. ¡Reserva tu cita con nosotros!`;
    
    const url = `https://api.whatsapp.com/send?phone=${clienteObj.telefono.replace(/\D/g,'')}&text=${encodeURIComponent(mensaje)}`;
    return url;
}
