"use strict";
 
// ===== ESTADO =====
const CLAVE_ALMACEN = "despertador.alarmas.v2";
let alarmas = [];
let alarmaSonando = null;     // alarma que está sonando ahora (o null)
let temporizadorMelodia = null;
let contextoAudio = null;
let minutoRevisado = "";      // para no disparar dos veces en el mismo minuto
let idEnEdicion = null;
 
const $ = id => document.getElementById(id);
 
// ===== UTILIDADES DE FECHA =====
const dos = n => String(n).padStart(2, "0");
const claveFecha = d => d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate());
const claveHora = d => dos(d.getHours()) + ":" + dos(d.getMinutes());
const fechaHoraDe = a => new Date(a.fecha + "T" + a.hora + ":00");
 
function inicioDelMinutoActual() {
    const d = new Date();
    d.setSeconds(0, 0);
    return d;
}
 
// ===== ALMACENAMIENTO =====
function leerAlmacen() {
    try {
        const datos = JSON.parse(localStorage.getItem(CLAVE_ALMACEN));
        return Array.isArray(datos) ? datos : [];
    } catch (e) {
        return [];
    }
}
 
function escribirAlmacen() {
    try { localStorage.setItem(CLAVE_ALMACEN, JSON.stringify(alarmas)); } catch (e) {}
}
 
// ===== RELOJ ANALÓGICO =====
function dibujarMarcas() {
    const grupo = $("marcas");
    const ns = "http://www.w3.org/2000/svg";
    for (let i = 0; i < 12; i++) {
        const linea = document.createElementNS(ns, "line");
        linea.setAttribute("x1", "100");
        linea.setAttribute("x2", "100");
        linea.setAttribute("y1", "12");
        linea.setAttribute("y2", i % 3 === 0 ? "26" : "20");
        linea.setAttribute("transform", "rotate(" + i * 30 + " 100 100)");
        linea.setAttribute("class", "marca");
        grupo.appendChild(linea);
    }
}
 
function girar(idMano, grados) {
    $(idMano).setAttribute("transform", "rotate(" + grados + " 100 100)");
}
 
function actualizarReloj() {
    const ahora = new Date();
    const h = ahora.getHours() % 12;
    const m = ahora.getMinutes();
    const s = ahora.getSeconds();
 
    girar("manoHora", h * 30 + m * 0.5);
    girar("manoMinuto", m * 6 + s * 0.1);
    girar("manoSegundo", s * 6);
 
    $("horaDigital").textContent = dos(ahora.getHours()) + ":" + dos(m) + ":" + dos(s);
    $("fechaTexto").textContent = ahora.toLocaleDateString("es-CR", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
 
    revisarAlarmas(ahora);
}
 
// ===== REVISAR SI ALGUNA ALARMA COINCIDE =====
function revisarAlarmas(ahora) {
    const minuto = claveFecha(ahora) + " " + claveHora(ahora);
    if (minuto === minutoRevisado) return;
    minutoRevisado = minuto;
 
    const coincide = alarmas.find(a =>
        a.activa && a.fecha === claveFecha(ahora) && a.hora === claveHora(ahora));
 
    if (coincide && !alarmaSonando) comenzarAviso(coincide);
    mostrarProxima();
}
 
// ===== SONIDO: pequeña melodía generada con Web Audio =====
function prepararAudio() {
    if (!contextoAudio) {
        const Contexto = window.AudioContext || window.webkitAudioContext;
        if (Contexto) contextoAudio = new Contexto();
    }
    if (contextoAudio && contextoAudio.state === "suspended") contextoAudio.resume();
}
 
function tocarMelodia() {
    if (!contextoAudio) return;
    const notas = [659.25, 783.99, 987.77, 783.99];
    notas.forEach((frecuencia, i) => {
        const inicio = contextoAudio.currentTime + i * 0.2;
        const osc = contextoAudio.createOscillator();
        const volumen = contextoAudio.createGain();
        osc.type = "triangle";
        osc.frequency.value = frecuencia;
        volumen.gain.setValueAtTime(0.25, inicio);
        volumen.gain.exponentialRampToValueAtTime(0.001, inicio + 0.18);
        osc.connect(volumen);
        volumen.connect(contextoAudio.destination);
        osc.start(inicio);
        osc.stop(inicio + 0.2);
    });
}
 
// ===== ALARMA SONANDO =====
function comenzarAviso(alarma) {
    alarmaSonando = alarma;
    $("tarjetaReloj").classList.add("sonando");
    $("avisoAlarma").hidden = false;
    $("textoAviso").textContent = "¡Alarma! " + (alarma.nombre || alarma.hora);
    tocarMelodia();
    temporizadorMelodia = setInterval(tocarMelodia, 1400);
}
 
function terminarAviso() {
    clearInterval(temporizadorMelodia);
    temporizadorMelodia = null;
    $("tarjetaReloj").classList.remove("sonando");
    $("avisoAlarma").hidden = true;
}
 
function detenerAlarma() {
    if (!alarmaSonando) return;
    alarmaSonando.activa = false;   // ya cumplió su función
    alarmaSonando = null;
    terminarAviso();
    escribirAlmacen();
    pintarLista();
    mostrarProxima();
}
 
function posponerAlarma() {
    if (!alarmaSonando) return;
    const nueva = new Date(fechaHoraDe(alarmaSonando).getTime() + 5 * 60000);
    alarmaSonando.fecha = claveFecha(nueva);
    alarmaSonando.hora = claveHora(nueva);
    alarmaSonando = null;
    terminarAviso();
    escribirAlmacen();
    pintarLista();
    mostrarProxima();
}
 
// ===== PRÓXIMA ALARMA =====
function mostrarProxima() {
    const ahora = Date.now();
    const futuras = alarmas
        .filter(a => a.activa && fechaHoraDe(a).getTime() > ahora)
        .sort((x, y) => fechaHoraDe(x) - fechaHoraDe(y));
 
    $("proxima").textContent = futuras.length
        ? "Próxima: " + futuras[0].fecha + " a las " + futuras[0].hora
        : "Sin alarmas activas";
}
 
// ===== LISTA EN PANTALLA =====
function pintarLista() {
    const ul = $("listaAlarmas");
    ul.innerHTML = "";
    $("sinAlarmas").hidden = alarmas.length > 0;
 
    const ordenadas = [...alarmas].sort((x, y) => fechaHoraDe(x) - fechaHoraDe(y));
 
    ordenadas.forEach(a => {
        const li = document.createElement("li");
        li.className = "alarma" + (a.activa ? "" : " inactiva");
 
        // interruptor
        const etiqueta = document.createElement("label");
        etiqueta.className = "interruptor";
        const check = document.createElement("input");
        check.type = "checkbox";
        check.checked = a.activa;
        check.dataset.accion = "alternar";
        check.dataset.id = a.id;
        const barra = document.createElement("span");
        etiqueta.append(check, barra);
 
        // información
        const info = document.createElement("div");
        info.className = "alarma-info";
        const hora = document.createElement("strong");
        hora.className = "alarma-hora";
        hora.textContent = a.hora;
        const detalle = document.createElement("span");
        detalle.className = "alarma-detalle";
        detalle.textContent = a.fecha + (a.nombre ? " · " + a.nombre : "");
        info.append(hora, detalle);
 
        // botones
        const acciones = document.createElement("div");
        acciones.className = "alarma-acciones";
        const bEditar = document.createElement("button");
        bEditar.className = "btn btn-gris btn-peque";
        bEditar.textContent = "Editar";
        bEditar.dataset.accion = "editar";
        bEditar.dataset.id = a.id;
        const bBorrar = document.createElement("button");
        bBorrar.className = "btn btn-borrar btn-peque";
        bBorrar.textContent = "Borrar";
        bBorrar.dataset.accion = "borrar";
        bBorrar.dataset.id = a.id;
        acciones.append(bEditar, bBorrar);
 
        li.append(etiqueta, info, acciones);
        ul.appendChild(li);
    });
}
 
// ===== AGREGAR =====
function yaPaso(fecha, hora) {
    return new Date(fecha + "T" + hora + ":00") < inicioDelMinutoActual();
}
 
function agregarAlarma(evento) {
    evento.preventDefault();
    prepararAudio();
 
    const fecha = $("inFecha").value;
    const hora = $("inHora").value;
    const error = $("msgError");
 
    if (!fecha || !hora) {
        error.textContent = "Elige la fecha y la hora.";
        error.hidden = false;
        return;
    }
    if (yaPaso(fecha, hora)) {
        error.textContent = "Esa fecha y hora ya pasaron.";
        error.hidden = false;
        return;
    }
 
    error.hidden = true;
    alarmas.push({
        id: Date.now(),
        fecha: fecha,
        hora: hora,
        nombre: $("inNombre").value.trim(),
        activa: true
    });
 
    escribirAlmacen();
    pintarLista();
    $("inHora").value = "";
    $("inNombre").value = "";
    minutoRevisado = "";          // para que una alarma del minuto actual sí suene
    mostrarProxima();
}
 
// ===== EDITAR =====
function abrirEdicion(id) {
    const a = alarmas.find(x => x.id === id);
    if (!a) return;
    idEnEdicion = id;
    $("edFecha").value = a.fecha;
    $("edHora").value = a.hora;
    $("edNombre").value = a.nombre;
    $("edError").hidden = true;
    $("dlgEditar").showModal();
}
 
function guardarEdicion(evento) {
    evento.preventDefault();
    const a = alarmas.find(x => x.id === idEnEdicion);
    if (!a) return;
 
    const fecha = $("edFecha").value;
    const hora = $("edHora").value;
 
    if (yaPaso(fecha, hora)) {
        $("edError").textContent = "Esa fecha y hora ya pasaron.";
        $("edError").hidden = false;
        return;
    }
 
    a.fecha = fecha;
    a.hora = hora;
    a.nombre = $("edNombre").value.trim();
    a.activa = true;
 
    escribirAlmacen();
    pintarLista();
    $("dlgEditar").close();
    minutoRevisado = "";
    mostrarProxima();
}
 
// ===== BORRAR / ACTIVAR =====
function borrarAlarma(id) {
    alarmas = alarmas.filter(a => a.id !== id);
    escribirAlmacen();
    pintarLista();
    mostrarProxima();
}
 
function alternarAlarma(id, valor) {
    const a = alarmas.find(x => x.id === id);
    if (a) a.activa = valor;
    escribirAlmacen();
    pintarLista();
    minutoRevisado = "";
    mostrarProxima();
}
 
// ===== EVENTOS =====
$("listaAlarmas").addEventListener("click", e => {
    const boton = e.target.closest("button");
    if (!boton) return;
    const id = Number(boton.dataset.id);
    if (boton.dataset.accion === "editar") abrirEdicion(id);
    if (boton.dataset.accion === "borrar") borrarAlarma(id);
});
 
$("listaAlarmas").addEventListener("change", e => {
    if (e.target.dataset.accion === "alternar") {
        alternarAlarma(Number(e.target.dataset.id), e.target.checked);
    }
});
 
$("formNueva").addEventListener("submit", agregarAlarma);
$("formEditar").addEventListener("submit", guardarEdicion);
$("btnCancelarEd").addEventListener("click", () => $("dlgEditar").close());
$("btnParar").addEventListener("click", detenerAlarma);
$("btnPosponer").addEventListener("click", posponerAlarma);
document.addEventListener("click", prepararAudio);
 
// ===== INICIO =====
alarmas = leerAlmacen();
dibujarMarcas();
$("inFecha").value = claveFecha(new Date());
$("inFecha").min = claveFecha(new Date());
pintarLista();
mostrarProxima();
actualizarReloj();
setInterval(actualizarReloj, 1000);