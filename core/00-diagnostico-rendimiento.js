/* Diagnóstico temporal de rendimiento de NelsonAppNew.
   Solo funciona con ?perf=1. No registra URL, nombres, teléfonos, órdenes ni contenido de fotos. */
(function () {
    try {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('perf')) return;
        const prefix = '[NelsonApp perf]';
        const startedAt = performance.now();
        let hiddenAt = document.hidden ? performance.now() : null;
        const report = (label, data) => {
            try { console.info(prefix + ' ' + label, data); } catch (_) {}
        };

        report('diagnóstico activo', {
            supportedLongTasks: typeof PerformanceObserver !== 'undefined',
            deviceMemoryGB: Number.isFinite(navigator.deviceMemory) ? navigator.deviceMemory : null,
            hardwareConcurrency: Number.isFinite(navigator.hardwareConcurrency) ? navigator.hardwareConcurrency : null
        });

        if (typeof PerformanceObserver !== 'undefined') {
            try {
                const longTaskObserver = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                        report('tarea larga', {
                            durationMs: Math.round(entry.duration),
                            startMs: Math.round(entry.startTime),
                            sinceDiagnosticsStartMs: Math.round(performance.now() - startedAt)
                        });
                    }
                });
                longTaskObserver.observe({ type: 'longtask', buffered: true });
            } catch (_) {
                report('tareas largas no compatibles', {});
            }

            try {
                const resourceObserver = new PerformanceObserver((list) => {
                    const slowImages = list.getEntries().filter((entry) =>
                        entry.initiatorType === 'img' && entry.duration >= 250
                    );
                    if (slowImages.length) {
                        report('carga lenta de imágenes', {
                            count: slowImages.length,
                            durationsMs: slowImages.slice(0, 8).map((entry) => Math.round(entry.duration)),
                            totalBytes: slowImages.reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
                        });
                    }
                });
                resourceObserver.observe({ type: 'resource', buffered: true });
            } catch (_) {}
        }

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                hiddenAt = performance.now();
                report('app pasa a segundo plano', { elapsedMs: Math.round(performance.now() - startedAt) });
                return;
            }
            const now = performance.now();
            report('app vuelve a primer plano', {
                awayMs: hiddenAt === null ? null : Math.round(now - hiddenAt),
                elapsedMs: Math.round(now - startedAt)
            });
            hiddenAt = null;
            if (performance.memory && Number.isFinite(performance.memory.usedJSHeapSize)) {
                report('memoria JS aproximada', {
                    usedMB: Math.round(performance.memory.usedJSHeapSize / 1048576),
                    limitMB: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
                });
            }
        });

        window.addEventListener('error', (event) => {
            report('error de interfaz', {
                message: String(event.message || 'Error').slice(0, 120),
                line: Number.isFinite(event.lineno) ? event.lineno : null,
                column: Number.isFinite(event.colno) ? event.colno : null
            });
        });
        window.addEventListener('unhandledrejection', () => {
            report('promesa rechazada sin manejar', {});
        });
    } catch (_) {
        // El diagnóstico nunca debe interrumpir el funcionamiento de la aplicación.
    }
})();
