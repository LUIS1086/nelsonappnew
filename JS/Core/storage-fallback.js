// Si el navegador bloquea localStorage/sessionStorage (cookies bloqueadas), usa memoria en vez de romper la app
    (function(){
        function mem(){ var d = {}; return {
            getItem: function(k){ return Object.prototype.hasOwnProperty.call(d,k) ? d[k] : null; },
            setItem: function(k,v){ d[k] = String(v); },
            removeItem: function(k){ delete d[k]; },
            clear: function(){ d = {}; },
            key: function(i){ return Object.keys(d)[i] || null; },
            get length(){ return Object.keys(d).length; }
        }; }
        ['localStorage','sessionStorage'].forEach(function(n){
            try { var probe = window[n]; void probe; }
            catch(e){ try { Object.defineProperty(window, n, { value: mem(), configurable: true }); } catch(_){} }
        });
    })();
