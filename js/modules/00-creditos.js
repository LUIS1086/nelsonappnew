/* Nelson App Pro · js/modules/00-creditos.js
   Acordeon de creditos y anio automatico
   (extraido sin cambios de index.html; el orden de carga importa) */

                function toggleCredits() {
                    const body   = document.getElementById('credits-body');
                    const arrow  = document.getElementById('credits-arrow');
                    const isOpen = body.style.maxHeight !== '0px' && body.style.maxHeight !== '';
                    if (isOpen) {
                        body.style.maxHeight  = '0px';
                        body.style.opacity    = '0';
                        arrow.style.transform = 'rotate(0deg)';
                    } else {
                        body.style.maxHeight  = '500px';
                        body.style.opacity    = '1';
                        arrow.style.transform = 'rotate(180deg)';
                    }
                }
                // Actualizar año automáticamente
                (function() {
                    const y = document.getElementById('credits-year');
                    if (y) y.textContent = new Date().getFullYear();
                })();
            