"use strict";
function $(id){ return document.getElementById(id); }

    function get(k){ try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
    function set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }

    var elegido = get("cuotajusta_cookies"); // "", "si" o "no"
    var banner = $("cookies");

    // Comunica a Google si puede usar cookies de publicidad. El script de AdSense
    // ya está cargado en el <head> (Google lo necesita para verificar el sitio),
    // pero arranca con el consentimiento DENEGADO por defecto; hasta que no se
    // llama aquí con "granted", no usa cookies de publicidad personalizada.
    function actualizarConsentimiento(concedido){
      if (typeof gtag !== "function") return;
      var v = concedido ? "granted" : "denied";
      gtag("consent", "update", {
        ad_storage: v, ad_user_data: v, ad_personalization: v, analytics_storage: v
      });
    }

    if (!elegido){
      banner.classList.add("visible");
    } else {
      actualizarConsentimiento(elegido === "si");
    }

    $("cookies-aceptar").addEventListener("click", function(){
      set("cuotajusta_cookies", "si");
      banner.classList.remove("visible");
      actualizarConsentimiento(true);
    });
    $("cookies-rechazar").addEventListener("click", function(){
      set("cuotajusta_cookies", "no");
      banner.classList.remove("visible");
      actualizarConsentimiento(false);
    });
    $("cookies-mas").addEventListener("click", function(e){
      e.preventDefault();
      $("cookies-detalle").classList.toggle("visible");
    });
