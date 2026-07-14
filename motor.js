"use strict";

// motor.js — datos y calculos compartidos entre index.html (portada) y analizador.html

  var DATOS = (window.DATOS_LIGAS && window.DATOS_LIGAS.competiciones) ? window.DATOS_LIGAS : window.DATOS_RESPALDO;
  var COMPS = DATOS.competiciones;

  var PERFIL = {
    WC:  { tar: 1.9,  fal: 11.5, cor: 4.6, roja: 0.30, fue: 2.0 },
    PD:  { tar: 2.45, fal: 13.4, cor: 4.9, roja: 0.45, fue: 2.3 },
    PL:  { tar: 1.85, fal: 10.5, cor: 5.5, roja: 0.20, fue: 1.8 },
    SA:  { tar: 2.3,  fal: 12.8, cor: 5.1, roja: 0.35, fue: 2.0 },
    BL1: { tar: 1.9,  fal: 11.8, cor: 5.2, roja: 0.25, fue: 1.9 },
    FL1: { tar: 2.0,  fal: 12.3, cor: 4.9, roja: 0.35, fue: 2.1 },
    def: { tar: 2.1,  fal: 12.0, cor: 5.0, roja: 0.30, fue: 2.0 }
  };
  var F1P = { gol: 0.44, tar: 0.36, fal: 0.47, tir: 0.45, cor: 0.45 };

  var SHARE_GOL = { DEL: 0.17, MED: 0.07, DEF: 0.028, POR: 0.002 };
  var TIROS_PUERTA = { DEL: 1.3, MED: 0.7, DEF: 0.3, POR: 0.0 };   // tiros a puerta por partido
  var REMATES = { DEL: 2.6, MED: 1.5, DEF: 0.9, POR: 0.05 };        // remates totales por partido
  var P_TARJETA = { DEL: 0.08, MED: 0.14, DEF: 0.17, POR: 0.02 };
  var FALT_REC  = { DEL: 1.7,  MED: 1.35, DEF: 0.75, POR: 0.12 };
  var POS_TXT   = { DEL: "delantero", MED: "centrocampista", DEF: "defensa", POR: "portero" };

  var CODIGOS_PAIS = {
    "España":"es","Spain":"es","Portugal":"pt","Francia":"fr","France":"fr",
    "Argentina":"ar","Brasil":"br","Brazil":"br","Inglaterra":"gb-eng","England":"gb-eng",
    "México":"mx","Mexico":"mx","Noruega":"no","Norway":"no","Países Bajos":"nl","Netherlands":"nl",
    "Alemania":"de","Germany":"de","Bélgica":"be","Belgium":"be","Estados Unidos":"us","USA":"us","United States":"us",
    "Suiza":"ch","Switzerland":"ch","Croacia":"hr","Croatia":"hr","Marruecos":"ma","Morocco":"ma",
    "Senegal":"sn","Egipto":"eg","Egypt":"eg","Colombia":"co","Japón":"jp","Japan":"jp",
    "Suecia":"se","Sweden":"se","Canadá":"ca","Canada":"ca","Paraguay":"py","Austria":"at",
    "Argelia":"dz","Algeria":"dz","Ghana":"gh","Costa de Marfil":"ci","Ivory Coast":"ci","Côte d'Ivoire":"ci",
    "Australia":"au","Ecuador":"ec","Sudáfrica":"za","South Africa":"za",
    "Bosnia y Herzegovina":"ba","Bosnia and Herzegovina":"ba","RD Congo":"cd","DR Congo":"cd","Cabo Verde":"cv","Cape Verde":"cv"
  };
  function urlBandera(nombre){
    var c = CODIGOS_PAIS[nombre];
    return c ? "https://flagcdn.com/" + c + ".svg" : null;
  }

  // --- Matemáticas ---
  function fact(n){ var r = 1; for (var i = 2; i <= n; i++) r *= i; return r; }
  function pois(k, l){ return Math.exp(-l) * Math.pow(l, k) / fact(k); }
  function pMasDe(l, linea){
    var acumulada = 0, tope = Math.floor(linea);
    for (var k = 0; k <= tope; k++) acumulada += pois(k, l);
    return 1 - acumulada;
  }

  function mediasCompeticion(comp){
    var eq = comp.equipos, suma = 0, sumaV = 0, n = 0;
    for (var nombre in eq){
      n++;
      if (comp.neutral){ suma += eq[nombre][0]; }
      else { suma += eq[nombre][0]; sumaV += eq[nombre][2]; }
    }
    return comp.neutral ? { h: suma / n, a: suma / n } : { h: suma / n, a: sumaV / n };
  }

  function calcularPartido(comp, local, visitante){
    var L = comp.equipos[local], V = comp.equipos[visitante];
    var M = mediasCompeticion(comp);
    var lh, la;
    if (comp.neutral){
      lh = L[0] * V[1] / M.h;
      la = V[0] * L[1] / M.a;
    } else {
      lh = L[0] * V[3] / M.h;
      la = V[2] * L[1] / M.a;
    }
    lh = Math.max(lh, 0.2); la = Math.max(la, 0.2);
    var p1 = 0, px = 0, p2 = 0, bttsY = 0;
    var mat = [], top = [];
    var i, j, p;
    for (i = 0; i <= 10; i++){
      mat[i] = [];
      for (j = 0; j <= 10; j++){
        p = pois(i, lh) * pois(j, la);
        mat[i][j] = p;
        if (i > j) p1 += p; else if (i === j) px += p; else p2 += p;
        if (i > 0 && j > 0) bttsY += p;
        top.push([i, j, p]);
      }
    }
    top.sort(function(a, b){ return b[2] - a[2]; });
    // Matriz de la 1ª parte (fracción de goles F1P.gol) y de la 2ª parte (el resto)
    var lh1 = lh * F1P.gol, la1 = la * F1P.gol;
    var lh2 = lh * (1 - F1P.gol), la2 = la * (1 - F1P.gol);
    var mat1 = [], mat2 = [];
    var p1h = 0, pxh = 0, p2h = 0, p1s = 0, pxs = 0, p2s = 0;
    var btts1 = 0, btts2 = 0;
    for (i = 0; i <= 8; i++){
      mat1[i] = []; mat2[i] = [];
      for (j = 0; j <= 8; j++){
        var q1 = pois(i, lh1) * pois(j, la1);
        var q2 = pois(i, lh2) * pois(j, la2);
        mat1[i][j] = q1; mat2[i][j] = q2;
        if (i > j){ p1h += q1; p1s += q2; }
        else if (i === j){ pxh += q1; pxs += q2; }
        else { p2h += q1; p2s += q2; }
        if (i > 0 && j > 0){ btts1 += q1; btts2 += q2; }
      }
    }
    return { lh: lh, la: la, p1: p1, px: px, p2: p2, mat: mat,
             lh1: lh1, la1: la1, lh2: lh2, la2: la2, mat1: mat1, mat2: mat2,
             p1h: p1h, pxh: pxh, p2h: p2h, p1s: p1s, pxs: pxs, p2s: p2s,
             btts1: btts1, btts2: btts2,
             bttsY: bttsY, top: top.slice(0, 3) };
  }

  // --- Formato ---
  function fPct(x, dec){
    var v = Math.max(Math.min(x, 0.999), 0.001);
    return (v * 100).toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + " %";
  }
  function fNum(x, dec){ return x.toLocaleString("es-ES", { minimumFractionDigits: dec, maximumFractionDigits: dec }); }
  function fFecha(iso){
    var meses = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
    var t = iso.split("-");
    return parseInt(t[2], 10) + " " + meses[parseInt(t[1], 10) - 1] + " " + t[0];
  }
  function fFechaHora(iso){
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var dias = ["dom","lun","mar","mié","jue","vie","sáb"];
    var hh = ("0" + d.getHours()).slice(-2), mm = ("0" + d.getMinutes()).slice(-2);
    return dias[d.getDay()] + " " + d.getDate() + " · " + hh + ":" + mm;
  }
  function numLinea(txt){ return parseFloat(String(txt).replace(",", ".")); }
  function normalizar(t){
    return String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
  }
  function fraseFrecuencia(p){
    if (p >= 0.5){
      var n = Math.round(p * 10);
      if (n >= 10) n = 9;
      return "acertarías unas <b>" + n + " de cada 10</b> veces";
    }
    var d = Math.round(1 / p);
    if (d > 100) d = 100;
    return "acertarías más o menos <b>1 de cada " + d + "</b> veces";
  }
  function nivelProb(p){
    if (p >= 0.75) return { txt: "Muy probable", clase: "verde", n: 5 };
    if (p >= 0.55) return { txt: "Probable", clase: "verde", n: 4 };
    if (p >= 0.38) return { txt: "Cara o cruz", clase: "oro", n: 3 };
    if (p >= 0.18) return { txt: "Difícil", clase: "oro", n: 2 };
    return { txt: "Muy difícil", clase: "rojo", n: 1 };
  }

  // --- Escudos ---
  function colorEquipo(nombre){
    var hash = 0;
    for (var i = 0; i < nombre.length; i++) hash = (hash * 31 + nombre.charCodeAt(i)) % 360;
    return "hsl(" + hash + ", 45%, 38%)";
  }
  function iniciales(nombre){
    var partes = nombre.split(/\s+/).filter(function(x){ return x.length > 1; });
    if (partes.length >= 2) return (partes[0][0] + partes[1][0]).toUpperCase();
    return nombre.slice(0, 2).toUpperCase();
  }
  function pintarEscudo(cont, nombre, comp){
    cont.innerHTML = "";
    if (!nombre) return;
    var bandera = urlBandera(nombre);
    if (bandera){
      var f = document.createElement("img");
      f.className = "bandera-img";
      f.alt = "Bandera de " + nombre; f.loading = "lazy";
      f.src = bandera;
      f.onerror = function(){ pintarIniciales(cont, nombre); };
      cont.appendChild(f); return;
    }
    var urls = (comp && comp.escudos) || {};
    if (urls[nombre]){
      var img = document.createElement("img");
      img.alt = "Escudo de " + nombre; img.loading = "lazy";
      img.src = urls[nombre];
      img.onerror = function(){ pintarIniciales(cont, nombre); };
      cont.appendChild(img); return;
    }
    pintarIniciales(cont, nombre);
  }
  function pintarIniciales(cont, nombre){
    cont.innerHTML = "";
    var d = document.createElement("span");
    d.className = "iniciales";
    d.style.background = colorEquipo(nombre);
    d.textContent = iniciales(nombre);
    cont.appendChild(d);
  }


  function nombreLado(ctx, side){ return side === "L" ? ctx.L : ctx.V; }
  function plantillaDe(comp, nombre){
    var pls = (comp && comp.plantillas) || {};
    return pls[nombre] || null;
  }

  function partidosSemana(comp){
    var lista = comp.partidos || [];
    // Ventana amplia: desde 6h antes de ahora (para que un partido recién empezado
    // o a punto de empezar NO desaparezca de las tarjetas) hasta 14 días por delante.
    var desde = Date.now() - 6 * 3600 * 1000;
    var hasta = Date.now() + 14 * 24 * 3600 * 1000;
    return lista.filter(function(p){
      var t = new Date(p[2]).getTime();
      return isFinite(t) && t >= desde && t <= hasta &&
             comp.equipos[p[0]] && comp.equipos[p[1]];
    }).sort(function(a, b){ return new Date(a[2]) - new Date(b[2]); });
  }


  // --- Texto de cada selección ---
  function txtPeriodo(per){ return per === "P" ? " · 1ª parte" : ""; }
  function txtDir(dir){ return dir === "O" ? "Más de " : "Menos de "; }

  function describir(s, ctx){
    var L = ctx.L, V = ctx.V;
    switch (s.t){
      case "R":
        var reg = ctx.comp.neutral ? " (90 min)" : "";
        if (s.v === "1") return "Gana " + L + reg;
        if (s.v === "X") return "Empate" + reg;
        if (s.v === "2") return "Gana " + V + reg;
        if (s.v === "1X") return L + " o empate (1X)" + reg;
        if (s.v === "12") return "No hay empate (12)" + reg;
        if (s.v === "X2") return "Empate o " + V + " (X2)" + reg;
        if (s.v === "DNB1") return "Gana " + L + " · empate no vale" + reg;
        if (s.v === "DNB2") return "Gana " + V + " · empate no vale" + reg;
        break;
      case "P1":
        if (s.v === "1") return "Al descanso gana " + L;
        if (s.v === "X") return "Empate al descanso";
        if (s.v === "2") return "Al descanso gana " + V;
        break;
      case "P2":
        if (s.v === "1") return "Gana la 2ª parte " + L;
        if (s.v === "X") return "Empate en la 2ª parte";
        if (s.v === "2") return "Gana la 2ª parte " + V;
        break;
      case "MG": return "Gana " + nombreLado(ctx, s.side) + " por " + s.n + " o más";
      case "HE":
        var signoHE = s.h > 0 ? "+" + s.h : "" + s.h;
        return "Hándicap europeo: " + nombreLado(ctx, s.side) + " (" + signoHE + ")";
      case "HA":
        var signoHA = s.h > 0 ? "+" + fNum(s.h, 1) : fNum(s.h, 1);
        return "Hándicap asiático: " + nombreLado(ctx, s.side) + " (" + signoHA + ")";
      case "DF":
        var et = { "1": L, "X": "empate", "2": V };
        return "Descanso/final: " + et[s.ht] + " / " + et[s.ft];
      case "BM": return "Ambos marcan en la " + (s.v === "1" ? "1ª" : "2ª") + " parte";
      case "MM":
        if (s.v === "1") return "Más goles en la 1ª parte";
        if (s.v === "X") return "Mismos goles en cada mitad";
        if (s.v === "2") return "Más goles en la 2ª parte";
        break;
      case "CM": return "Más córners: " + nombreLado(ctx, s.side);
      case "C":
        if (s.v === "1BTTS") return "Gana " + L + " y ambos marcan";
        if (s.v === "2BTTS") return "Gana " + V + " y ambos marcan";
        if (s.v === "1O15") return "Gana " + L + " y más de 1,5 goles";
        if (s.v === "2O15") return "Gana " + V + " y más de 1,5 goles";
        if (s.v === "1O25") return "Gana " + L + " y más de 2,5 goles";
        if (s.v === "2O25") return "Gana " + V + " y más de 2,5 goles";
        if (s.v === "1CS") return "Gana " + L + " sin encajar (a cero)";
        if (s.v === "2CS") return "Gana " + V + " sin encajar (a cero)";
        if (s.v === "1M2") return "Gana " + L + " por 2 goles o más";
        if (s.v === "2M2") return "Gana " + V + " por 2 goles o más";
        if (s.v === "1BO35") return "Gana " + L + ", ambos marcan y más de 3,5 goles";
        if (s.v === "2BO35") return "Gana " + V + ", ambos marcan y más de 3,5 goles";
        if (s.v === "BTTSO25") return "Ambos marcan y más de 2,5 goles";
        if (s.v === "1CO") return "Gana " + L + " y más de 8,5 córners";
        if (s.v === "2CO") return "Gana " + V + " y más de 8,5 córners";
        break;
      case "B": return s.v === "Y" ? "Ambos equipos marcan" : "No marcan los dos equipos";
      case "PAR": return s.v === "P" ? "Goles totales: par" : "Goles totales: impar";
      case "CS": return nombreLado(ctx, s.side) + " deja la portería a cero";
      case "EX": return "Marcador exacto " + s.gl + "–" + s.gv;
      case "GT": return txtDir(s.dir) + fNum(s.linea, 1) + " goles" + txtPeriodo(s.per);
      case "GE": return txtDir(s.dir) + fNum(s.linea, 1) + " goles de " + nombreLado(ctx, s.side) + txtPeriodo(s.per);
      case "TE": return txtDir(s.dir) + fNum(s.linea, 1) + " amarillas de " + nombreLado(ctx, s.side) + txtPeriodo(s.per);
      case "TT": return txtDir(s.dir) + fNum(s.linea, 1) + " amarillas en el partido" + txtPeriodo(s.per);
      case "RJ": return s.v === "Y" ? "Habrá tarjeta roja" : "No habrá tarjeta roja";
      case "FE": return txtDir(s.dir) + fNum(s.linea, 1) + " faltas de " + nombreLado(ctx, s.side) + txtPeriodo(s.per);
      case "FJ": return txtDir(s.dir) + fNum(s.linea, 1) + " fueras de juego de " + nombreLado(ctx, s.side) + txtPeriodo(s.per);
      case "FJT": return txtDir(s.dir) + fNum(s.linea, 1) + " fueras de juego en el partido" + txtPeriodo(s.per);
      case "CO": return txtDir(s.dir) + fNum(s.linea, 1) + " córners de " + nombreLado(ctx, s.side) + txtPeriodo(s.per);
      case "COT": return txtDir(s.dir) + fNum(s.linea, 1) + " córners en el partido" + txtPeriodo(s.per);
      case "TI": return txtDir(s.dir) + fNum(s.linea, 1) + " tiros a puerta de " + nombreLado(ctx, s.side) + txtPeriodo(s.per);
      case "JU":
        var nombre = s.jn;
        if (!nombre){
          var pl = plantillaDe(ctx.comp, nombreLado(ctx, s.side));
          nombre = (pl && pl[s.pi]) ? pl[s.pi][0] : "Jugador";
        }
        if (s.m === "G1") return nombre + " marca gol";
        if (s.m === "G1P") return nombre + " marca en la 1ª parte";
        if (s.m === "G2") return nombre + " marca 2 o más";
        if (s.m === "TT1") return nombre + " · más de 0,5 tiros a puerta";
        if (s.m === "TT2") return nombre + " · más de 1,5 tiros a puerta";
        if (s.m === "RE2") return nombre + " · más de 1,5 remates";
        if (s.m === "RE3") return nombre + " · más de 2,5 remates";
        if (s.m === "PA2") return nombre + " · más de 1,5 paradas";
        if (s.m === "PA3") return nombre + " · más de 2,5 paradas";
        if (s.m === "PA4") return nombre + " · más de 3,5 paradas";
        if (s.m === "TA") return nombre + " recibe tarjeta amarilla";
        if (s.m === "F1") return nombre + " recibe más de 1,5 faltas";
        if (s.m === "F2") return nombre + " recibe más de 2,5 faltas";
        break;
      case "NA": return s.texto || "Selección no reconocida";
    }
    return "Selección";
  }


  // --- Probabilidad de cada selección ---
  function calcular(s, m, ctx){
    var comp = ctx.comp;
    var perfil = PERFIL[comp.codigo] || PERFIL.def;
    var fGol = s.per === "P" ? F1P.gol : 1;
    var fTar = s.per === "P" ? F1P.tar : 1;
    var fFal = s.per === "P" ? F1P.fal : 1;
    var fTir = s.per === "P" ? F1P.tir : 1;
    var fCor = s.per === "P" ? F1P.cor : 1;
    var lado, lam, suma, i, j;
    switch (s.t){
      case "R":
        if (s.v === "1") return m.p1;
        if (s.v === "X") return m.px;
        if (s.v === "2") return m.p2;
        if (s.v === "1X") return m.p1 + m.px;
        if (s.v === "12") return m.p1 + m.p2;
        if (s.v === "X2") return m.px + m.p2;
        if (s.v === "DNB1") return m.p1 / (m.p1 + m.p2);
        if (s.v === "DNB2") return m.p2 / (m.p1 + m.p2);
        break;
      case "P1":
        if (s.v === "1") return m.p1h;
        if (s.v === "X") return m.pxh;
        if (s.v === "2") return m.p2h;
        break;
      case "P2":
        if (s.v === "1") return m.p1s;
        if (s.v === "X") return m.pxs;
        if (s.v === "2") return m.p2s;
        break;
      case "MG":
        suma = 0;
        for (i = 0; i <= 10; i++) for (j = 0; j <= 10; j++){
          if (s.side === "L" ? (i - j) >= s.n : (j - i) >= s.n) suma += m.mat[i][j];
        }
        return suma;
      case "HE":
        // Hándicap europeo: se aplica el hándicap al equipo elegido y debe GANAR el ajustado
        suma = 0;
        for (i = 0; i <= 10; i++) for (j = 0; j <= 10; j++){
          var difHE = s.side === "L" ? (i + s.h) - j : (j + s.h) - i;
          if (difHE > 0) suma += m.mat[i][j];
        }
        return suma;
      case "HA":
        // Hándicap asiático de línea entera o media: empate del ajustado devuelve (se reparte)
        var gana = 0, empate = 0;
        for (i = 0; i <= 10; i++) for (j = 0; j <= 10; j++){
          var difHA = s.side === "L" ? (i + s.h) - j : (j + s.h) - i;
          if (difHA > 0.001) gana += m.mat[i][j];
          else if (Math.abs(difHA) < 0.001) empate += m.mat[i][j];
        }
        // La parte de empate (solo en líneas enteras) se considera devolución: se excluye
        var jugado = 1 - empate;
        return jugado > 0 ? gana / jugado : gana;
      case "DF":
        // Descanso/final: prob(resultado 1ª parte) x prob(resultado 2ª parte que lleve al final pedido)
        // Se calcula sobre la matriz combinada de mitades
        suma = 0;
        for (var a = 0; a <= 8; a++) for (var b = 0; b <= 8; b++){
          var ht = a > b ? "1" : (a === b ? "X" : "2");
          if (ht !== s.ht) continue;
          for (var c = 0; c <= 8; c++) for (var d = 0; d <= 8; d++){
            var fl = a + c, fv = b + d;
            var ft = fl > fv ? "1" : (fl === fv ? "X" : "2");
            if (ft === s.ft) suma += m.mat1[a][b] * m.mat2[c][d];
          }
        }
        return suma;
      case "BM": return s.v === "1" ? m.btts1 : m.btts2;
      case "MM":
        // Comparar goles de cada mitad
        var g1mas = 0, iguales = 0;
        var tot1 = [], tot2 = [];
        for (i = 0; i <= 16; i++){ tot1[i] = 0; tot2[i] = 0; }
        for (i = 0; i <= 8; i++) for (j = 0; j <= 8; j++){
          tot1[i + j] += m.mat1[i][j];
          tot2[i + j] += m.mat2[i][j];
        }
        for (i = 0; i <= 16; i++) for (j = 0; j <= 16; j++){
          var pp = tot1[i] * tot2[j];
          if (i > j) g1mas += pp; else if (i === j) iguales += pp;
        }
        if (s.v === "1") return g1mas;
        if (s.v === "X") return iguales;
        if (s.v === "2") return 1 - g1mas - iguales;
        break;
      case "CM":
        // Equipo con más córners: reparto por fuerza ofensiva
        var cL = Math.max(m.lh, 0.2), cV = Math.max(m.la, 0.2);
        var pMasL = 0.5 + 0.32 * (cL - cV) / (cL + cV);
        pMasL = Math.max(Math.min(pMasL, 0.85), 0.15);
        return s.side === "L" ? pMasL * 0.86 : (1 - pMasL) * 0.86; // 14% aprox de empate
      case "C":
        // Combinadas del mismo partido, calculadas exactas sobre la matriz de marcadores
        if (s.v === "1BTTS" || s.v === "2BTTS"){
          suma = 0;
          for (i = 1; i <= 10; i++) for (j = 1; j <= 10; j++){
            if (s.v === "1BTTS" ? (i > j) : (j > i)) suma += m.mat[i][j];
          }
          return suma; // el equipo elegido gana Y ambos marcan (ambos >=1)
        }
        if (s.v === "1O15" || s.v === "2O15" || s.v === "1O25" || s.v === "2O25"){
          var lineaC = (s.v === "1O15" || s.v === "2O15") ? 2 : 3; // "más de 1,5" → suma>=2; "más de 2,5" → suma>=3
          var esLocalC = (s.v === "1O15" || s.v === "1O25");
          suma = 0;
          for (i = 0; i <= 10; i++) for (j = 0; j <= 10; j++){
            var ganaC = esLocalC ? (i > j) : (j > i);
            if (ganaC && (i + j) >= lineaC) suma += m.mat[i][j];
          }
          return suma;
        }
        if (s.v === "1CS" || s.v === "2CS"){
          // Gana sin encajar: el rival se queda en 0
          suma = 0;
          if (s.v === "1CS"){ for (i = 1; i <= 10; i++) suma += m.mat[i][0]; }
          else { for (j = 1; j <= 10; j++) suma += m.mat[0][j]; }
          return suma;
        }
        if (s.v === "1M2" || s.v === "2M2"){
          // Gana por 2 goles o más de diferencia
          suma = 0;
          for (i = 0; i <= 10; i++) for (j = 0; j <= 10; j++){
            var dif = s.v === "1M2" ? (i - j) : (j - i);
            if (dif >= 2) suma += m.mat[i][j];
          }
          return suma;
        }
        if (s.v === "1BO35" || s.v === "2BO35"){
          // Gana + ambos marcan + más de 3,5 goles (ej. 3-1, 4-1, 3-2...)
          suma = 0;
          for (i = 1; i <= 10; i++) for (j = 1; j <= 10; j++){
            var ganaB = s.v === "1BO35" ? (i > j) : (j > i);
            if (ganaB && (i + j) >= 4) suma += m.mat[i][j];
          }
          return suma;
        }
        if (s.v === "BTTSO25"){
          // Ambos marcan Y más de 2,5 goles (no depende de quién gane)
          suma = 0;
          for (i = 1; i <= 10; i++) for (j = 1; j <= 10; j++){
            if ((i + j) >= 3) suma += m.mat[i][j];
          }
          return suma;
        }
        if (s.v === "1CO" || s.v === "2CO"){
          // Gana el favorito Y más de 8,5 córners en el partido.
          // Goles y córners se tratan como aproximadamente independientes.
          suma = 0;
          for (i = 0; i <= 10; i++) for (j = 0; j <= 10; j++){
            var ganaCO = s.v === "1CO" ? (i > j) : (j > i);
            if (ganaCO) suma += m.mat[i][j];
          }
          var lamCor = perfil.cor * 2 * fCor;
          return suma * pMasDe(lamCor, 8.5);
        }
        break;
      case "B": return s.v === "Y" ? m.bttsY : 1 - m.bttsY;
      case "PAR":
        suma = 0;
        for (i = 0; i <= 10; i++) for (j = 0; j <= 10; j++){
          if ((i + j) % 2 === 0) suma += m.mat[i][j];
        }
        return s.v === "P" ? suma : 1 - suma;
      case "CS": return s.side === "L" ? Math.exp(-m.la) : Math.exp(-m.lh);
      case "EX":
        if (s.gl > 10 || s.gv > 10 || s.gl < 0 || s.gv < 0) return null;
        return m.mat[s.gl][s.gv];
      case "GT":
        lam = (m.lh + m.la) * fGol;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "GE":
        lam = (s.side === "L" ? m.lh : m.la) * fGol;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "TE":
        lam = perfil.tar * fTar;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "TT":
        lam = 2 * perfil.tar * fTar;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "RJ":
        var pr = 1 - Math.exp(-perfil.roja);
        return s.v === "Y" ? pr : 1 - pr;
      case "FE":
        lam = perfil.fal * fFal;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "FJ":
        lam = perfil.fue * fFal; // reutiliza el factor de primera parte de faltas, ritmo similar
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "FJT":
        lam = 2 * perfil.fue * fFal;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "CO":
        lam = perfil.cor * fCor;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "COT":
        lam = 2 * perfil.cor * fCor;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "TI":
        lado = s.side === "L" ? m.lh : m.la;
        lam = Math.max(lado * 3.1, 2.2) * fTir;
        return s.dir === "O" ? pMasDe(lam, s.linea) : 1 - pMasDe(lam, s.linea);
      case "JU":
        var pos = s.pos, estrella = false;
        if (!s.libre){
          var pl = plantillaDe(comp, nombreLado(ctx, s.side));
          if (!pl || !pl[s.pi]) return null;
          pos = pl[s.pi][1];
          estrella = pl[s.pi][2] === 1;
        }
        if (!pos) return null;
        if (s.m === "G1" || s.m === "G2"){
          var share = Math.min((SHARE_GOL[pos] || 0.05) * (estrella ? 2.3 : 1), 0.5);
          var lp = (s.side === "L" ? m.lh : m.la) * share;
          if (s.m === "G1") return 1 - Math.exp(-lp);
          return 1 - Math.exp(-lp) * (1 + lp);
        }
        if (s.m === "G1P"){
          // Marca en la 1ª parte: ~45% de los goles caen antes del descanso
          var shareP = Math.min((SHARE_GOL[pos] || 0.05) * (estrella ? 2.3 : 1), 0.5);
          var lpP = (s.side === "L" ? m.lh : m.la) * shareP * 0.45;
          return 1 - Math.exp(-lpP);
        }
        if (s.m === "TT1" || s.m === "TT2"){
          var lt = (TIROS_PUERTA[pos] || 0.4) * (estrella ? 1.5 : 1);
          return pMasDe(lt, s.m === "TT1" ? 0.5 : 1.5);
        }
        if (s.m === "RE2" || s.m === "RE3"){
          var lr = (REMATES[pos] || 1) * (estrella ? 1.5 : 1);
          return pMasDe(lr, s.m === "RE2" ? 1.5 : 2.5);
        }
        if (s.m === "PA2" || s.m === "PA3" || s.m === "PA4"){
          // Paradas del portero = tiros a puerta del rival que no acaban en gol.
          // Tiros a puerta del rival ≈ goles esperados del rival × 3,1; de esos, restamos los goles.
          var golesRival = (s.side === "L" ? m.la : m.lh);
          var tirosRival = Math.max(golesRival * 3.1, 2.0);
          var paradas = Math.max(tirosRival - golesRival, 0.5);
          var linea = s.m === "PA2" ? 1.5 : (s.m === "PA3" ? 2.5 : 3.5);
          return pMasDe(paradas, linea);
        }
        if (s.m === "TA"){
          return Math.min((P_TARJETA[pos] || 0.1) * (perfil.tar / 2.1), 0.5);
        }
        if (s.m === "F1" || s.m === "F2"){
          var lf = (FALT_REC[pos] || 1) * (estrella ? 1.25 : 1);
          return pMasDe(lf, s.m === "F1" ? 1.5 : 2.5);
        }
        break;
      case "NA": return null;
    }
    return null;
  }


  function nombreCompDe(comp){
    for (var n in COMPS){ if (COMPS[n] === comp) return n; }
    return "";
  }

  // Selección compartida: evalúa candidatos, filtra por banda de probabilidad,
  // ordena de más a menos probable y quita duplicados de texto.
  function elegirEnBanda(candidatos, ctx, m, pMin, pMax, max, estricto){
    var evaluados = candidatos.map(function(sel){
      return { sel: sel, p: calcular(sel, m, ctx) };
    }).filter(function(c){ return c.p !== null && isFinite(c.p); });
    var enBanda = evaluados.filter(function(c){ return c.p >= pMin && c.p <= pMax; });
    enBanda.sort(function(a, b){ return b.p - a.p; });
    // Si la banda queda vacía y NO es estricto, se rescata lo más cercano por debajo
    // del techo. En modo estricto (seguras) no se rescata nada por encima del techo:
    // preferimos mostrar menos tarjetas antes que una apuesta sin valor (cuota < 2,00).
    if (!enBanda.length && !estricto){
      var bajoTecho = evaluados.filter(function(c){ return c.p <= pMax; });
      bajoTecho.sort(function(a, b){ return b.p - a.p; });
      enBanda = bajoTecho.slice(0, 1);
    }
    var vistos = {}, resultado = [];
    enBanda.forEach(function(c){
      var txt = describir(c.sel, ctx);
      if (vistos[txt]) return;
      // Mismo suceso con otro nombre (ej. "gana por 2+" y "hándicap -1,5"): probabilidad clavada
      var clon = resultado.some(function(r){ return Math.abs(r.p - c.p) < 0.005; });
      if (clon) return;
      vistos[txt] = 1;
      if (resultado.length < max) resultado.push(c);
    });
    return resultado;
  }

  // "Cuota del día": apuestas con valor real. Cuota justa MÍNIMA 2,00 (probabilidad
  // máxima 50%) y máxima ~2,9 (probabilidad mínima 34%): confianza, pero pagando de verdad.
  // Nunca se rescata nada por encima del 50% (eso sería una apuesta sin valor).
  function mejoresApuestas(ctx, m, max){
    var fav = m.p1 >= m.p2 ? "L" : "V";
    var pre = fav === "L" ? "1" : "2";
    var candidatos = [
      { t: "GT", dir: "O", linea: 2.5, per: "F" },
      { t: "GT", dir: "U", linea: 2.5, per: "F" },
      { t: "B", v: "Y" },
      { t: "C", v: pre + "O15" },     // gana el favorito y más de 1,5
      { t: "C", v: pre + "CS" },      // gana el favorito y portería a cero
      { t: "CS", side: fav },         // el favorito no encaja
      { t: "MG", side: fav, n: 2 },   // el favorito marca 2+
      { t: "P1", v: fav === "L" ? "1" : "2" }, // gana la 1ª parte
      { t: "DF", side: fav },         // doble oportunidad del favorito con hándicap
      { t: "HE", side: fav, h: -1 },  // hándicap europeo -1
      { t: "GE", side: fav, dir: "O", linea: 1.5, per: "F" } // el favorito marca más de 1,5
    ];
    // Banda estricta: probabilidad 34%-50% = cuota justa 2,00-2,94. Sin rescate por encima.
    return elegirEnBanda(candidatos, ctx, m, 0.34, 0.50, max, true);
  }

  // "Soñadoras": el golpe que paga fuerte pero es posible. Cuota justa ~3,3 a ~7
  // (probabilidad 14%-30%). Más ambiciosas: resultados exactos, cracks marcando,
  // remontadas, goleadas del favorito.
  function apuestasSonadoras(ctx, m, max){
    var fav = m.p1 >= m.p2 ? "L" : "V";
    var noFav = fav === "L" ? "V" : "L";
    var candidatos = [
      { t: "GT", dir: "O", linea: 3.5, per: "F" },              // partido de goles
      { t: "MG", side: fav, n: 3 },                             // el favorito mete 3+
      { t: "C", v: (fav === "L" ? "1" : "2") + "BO35" },        // gana el favorito y más de 3,5
      { t: "C", v: (fav === "L" ? "1" : "2") + "M2" },          // el favorito gana por 2+
      { t: "EX", gl: fav === "L" ? 2 : 1, gv: fav === "L" ? 1 : 2 }, // resultado exacto 2-1
      { t: "EX", gl: fav === "L" ? 3 : 0, gv: fav === "L" ? 0 : 3 }, // resultado exacto 3-0
      { t: "EX", gl: fav === "L" ? 3 : 1, gv: fav === "L" ? 1 : 3 }, // resultado exacto 3-1
      { t: "EX", gl: 2, gv: 2 },                                // el clásico 2-2
      { t: "HA", side: fav, h: -2 },                            // hándicap -2 del favorito
      { t: "R", v: noFav === "L" ? "1" : "2" },                 // gana el no favorito (sorpresa)
      { t: "MM", v: "P1" }                                      // marca más goles en la 1ª parte
    ];
    // Cracks: marca gol, marca 2+, y marca en la 1ª parte (más jugosa)
    var pl = plantillaDe(ctx.comp, fav === "L" ? ctx.L : ctx.V);
    if (pl){
      for (var k = 0; k < pl.length; k++){
        if (pl[k][1] === "DEL" && pl[k][2] === 1){
          candidatos.push({ t: "JU", side: fav, pi: k, m: "G2", jn: pl[k][0] });
          candidatos.push({ t: "JU", side: fav, pi: k, m: "G1P", jn: pl[k][0] });
          break;
        }
      }
    }
    return elegirEnBanda(candidatos, ctx, m, 0.14, 0.30, max, false);
  }

  // Combinadas del mismo partido, calculadas de forma exacta sobre la matriz de
  // marcadores. Ahora más elaboradas: mezclan resultado + goles + tarjetas/córners
  // + portería, en un abanico de conservadora a valiente.
  function combosDisponibles(ctx, m){
    var fav = m.p1 >= m.p2 ? "L" : "V";
    var pre = fav === "L" ? "1" : "2";
    var candidatos = [
      { t: "C", v: pre + "O15" },      // gana favorito + más de 1,5
      { t: "C", v: pre + "CS" },       // gana favorito + portería a cero
      { t: "C", v: pre + "BTTS" },     // gana favorito + ambos marcan
      { t: "C", v: pre + "O25" },      // gana favorito + más de 2,5
      { t: "C", v: pre + "M2" },       // gana favorito por 2+
      { t: "C", v: pre + "BO35" },     // gana favorito + más de 3,5
      { t: "C", v: "BTTSO25" },        // ambos marcan + más de 2,5 (no depende de quién gane)
      { t: "C", v: pre + "CO" }        // gana favorito + más de 8,5 córners
    ];
    var evaluados = candidatos.map(function(sel){
      return { sel: sel, p: calcular(sel, m, ctx) };
    }).filter(function(c){ return c.p !== null && isFinite(c.p) && c.p >= 0.08 && c.p <= 0.62; });
    evaluados.sort(function(a, b){ return b.p - a.p; });
    var resultado = [];
    evaluados.forEach(function(c){
      var repetido = resultado.some(function(r){
        return describir(r.sel, ctx) === describir(c.sel, ctx) || Math.abs(r.p - c.p) < 0.015;
      });
      if (!repetido) resultado.push(c);
    });
    return resultado;
  }


  function partidosParaTarjetas(){
    var todos = [];
    for (var nombre in COMPS){
      partidosSemana(COMPS[nombre]).forEach(function(p){
        todos.push({ compN: nombre, comp: COMPS[nombre], p: p });
      });
    }
    todos.sort(function(a, b){ return new Date(a.p[2]) - new Date(b.p[2]); });
    return todos;
  }

  // Reparte cuántas tarjetas tocan por partido según cuántos partidos hay,
  // para que con pocos partidos (ej. 1 en fase de eliminatorias) se vean varias
  // apuestas de ese partido, y con muchos no se sature la sección.
  function tarjetasPorPartido(nPartidos, totalDeseado){
    return Math.max(1, Math.min(3, Math.ceil(totalDeseado / Math.max(nPartidos, 1))));
  }

