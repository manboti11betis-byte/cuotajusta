"use strict";
function $(id){ return document.getElementById(id); }

    function get(k){ try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
    function set(k, v){ try { localStorage.setItem(k, v); } catch (e) {} }

    var elegido = get("cuotajusta_cookies"); // "", "si" o "no"
    var banner = $("cookies");

    function activarPublicidad(){
      // HUECO PREPARADO PARA ADSENSE.
      // El día que Google te apruebe, aquí se carga el script de anuncios,
      // y SOLO se ejecuta si el usuario ha aceptado (cumpliendo la ley).
      if (window._adsenseCargado) return;
      window._adsenseCargado = true;
      // Ejemplo (déjalo comentado hasta tener tu ID de AdSense):
      // var s = document.createElement("script");
      // s.async = true;
      // s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-TU_ID";
      // s.crossOrigin = "anonymous";
      // document.head.appendChild(s);
    }

    if (!elegido){
      banner.classList.add("visible");
    } else if (elegido === "si"){
      activarPublicidad();
    }

    $("cookies-aceptar").addEventListener("click", function(){
      set("cuotajusta_cookies", "si");
      banner.classList.remove("visible");
      activarPublicidad();
    });
    $("cookies-rechazar").addEventListener("click", function(){
      set("cuotajusta_cookies", "no");
      banner.classList.remove("visible");
    });
    $("cookies-mas").addEventListener("click", function(e){
      e.preventDefault();
      $("cookies-detalle").classList.toggle("visible");
    });
