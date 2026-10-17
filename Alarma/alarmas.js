const NOMBRES_DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
let alarmas = [];
let idEditando = null;      // id de la alarma que se está editando (null = agregando)
let alarmaSonando = false;
let ultimoMinuto = "";      // evita repetir la misma alarma en el mismo minuto
let audioCtx = null;
let intervaloSonido = null;
 
// ===== ELEMENTOS =====
const reloj = document.getElementById("reloj");
const horaActual = document.getElementById("horaActual");
const diaActual = document.getElementById("diaActual");
const mensajeAlarma = document.getElementById("mensajeAlarma");
const btnDetener = document.getElementById("btnDetener");
const selDia = document.getElementById("dia");
const inpHora = document.getElementById("hora");
const inpNombre = document.getElementById("nombre");
const btnGuardar = document.getElementById("btnGuardar");
const btnCancelar = document.getElementById("btnCancelar");
const tituloForm = document.getElementById("tituloForm");
const errorBox = document.getElementById("error");
const lista = document.getElementById("lista");
const vacio = document.getElementById("vacio");
 
// ===== GUARDAR / CARGAR =====
function guardar() {
    try { localStorage.setItem("alarmas", JSON.stringify(alarmas)); } catch (e) {}
}
 
function cargar() {
    try {
        const datos = JSON.parse(localStorage.getItem("alarmas"));
        if (Array.isArray(datos)) alarmas = datos;
    } catch (e) {
        alarmas = [];
    }
}
 
// ===== SONIDO (sin archivos externos) =====
function iniciarAudio() {
    if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
 
function pitido() {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const vol = audioCtx.createGain();
    osc.type = "square";
    osc.frequency.value = 880;
    vol.gain.value = 0.15;
    osc.connect(vol);
    vol.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
}
 
function iniciarSonido() {
    pitido();
    intervaloSonido = setInterval(pitido, 600);
}
 
function detenerSonido() {
    clearInterval(intervaloSonido);
    intervaloSonido = null;
}
 
// ===== ALARMA ACTIVA =====
function activarAlarma(alarma) {
    alarmaSonando = true;
    reloj.classList.add("sonando");
    mensajeAlarma.hidden = false;
    mensajeAlarma.textContent = "⏰ ¡Alarma! " + (alarma.nombre || alarma.hora);
    btnDetener.hidden = false;
    iniciarSonido();
}
 
function detenerAlarma() {
    alarmaSonando = false;
    reloj.classList.remove("sonando");
    mensajeAlarma.hidden = true;
    btnDetener.hidden = true;
    detenerSonido();
}
 
// ===== RELOJ =====
function dos(n) { return String(n).padStart(2, "0"); }
 
function actualizarReloj() {
    const ahora = new Date();
    const h = dos(ahora.getHours());
    const m = dos(ahora.getMinutes());
    const s = dos(ahora.getSeconds());
 
    horaActual.textContent = h + ":" + m + ":" + s;
    diaActual.textContent = NOMBRES_DIAS[ahora.getDay()];
 
    // Verificar si alguna alarma coincide con este momento
    const claveMinuto = ahora.getDay() + "-" + h + ":" + m;
    if (claveMinuto !== ultimoMinuto) {
        ultimoMinuto = claveMinuto;
        const coincide = alarmas.find(a => Number(a.dia) === ahora.getDay() && a.hora === h + ":" + m);
        if (coincide && !alarmaSonando) activarAlarma(coincide);
    }
}
 
// ===== LISTA =====
function mostrarLista() {
    lista.innerHTML = "";
    vacio.hidden = alarmas.length > 0;
 
    // ordenar por día (Lunes a Domingo) y luego por hora
    const orden = d => (Number(d) + 6) % 7;
    const ordenadas = [...alarmas].sort((a, b) =>
        orden(a.dia) - orden(b.dia) || a.hora.localeCompare(b.hora));
 
    ordenadas.forEach(a => {
        const li = document.createElement("li");
        li.className = "alarma";
 
        const datos = document.createElement("div");
        datos.className = "datos";
        const hora = document.createElement("strong");
        hora.textContent = a.hora;
        const detalle = document.createElement("span");
        detalle.textContent = NOMBRES_DIAS[a.dia] + (a.nombre ? " · " + a.nombre : "");
        datos.append(hora, detalle);
 
        const acciones = document.createElement("div");
        acciones.className = "acciones";
 
        const btnEditar = document.createElement("button");
        btnEditar.className = "boton secundario pequeno";
        btnEditar.textContent = "Editar";
        btnEditar.addEventListener("click", () => editar(a.id));
 
        const btnBorrar = document.createElement("button");
        btnBorrar.className = "boton peligro pequeno";
        btnBorrar.textContent = "Borrar";
        btnBorrar.addEventListener("click", () => borrar(a.id));
 
        acciones.append(btnEditar, btnBorrar);
        li.append(datos, acciones);
        lista.appendChild(li);
    });
}
 
// ===== AGREGAR / EDITAR / BORRAR =====
function mostrarError(texto) {
    errorBox.textContent = texto;
    errorBox.hidden = !texto;
}
 
function limpiarFormulario() {
    idEditando = null;
    inpNombre.value = "";
    inpHora.value = "";
    selDia.value = String(new Date().getDay());
    tituloForm.textContent = "Agregar alarma";
    btnGuardar.textContent = "Agregar alarma";
    btnCancelar.hidden = true;
    mostrarError("");
}
 
function guardarAlarma() {
    iniciarAudio(); // el navegador exige un clic del usuario para permitir sonido
 
    if (!inpHora.value) {
        mostrarError("Selecciona la hora de la alarma.");
        return;
    }
 
    const datos = {
        dia: Number(selDia.value),
        hora: inpHora.value,
        nombre: inpNombre.value.trim()
    };
 
    if (idEditando === null) {
        alarmas.push({ id: Date.now(), ...datos });
    } else {
        const a = alarmas.find(x => x.id === idEditando);
        if (a) Object.assign(a, datos);
    }
 
    guardar();
    mostrarLista();
    limpiarFormulario();
    ultimoMinuto = ""; // permite que una alarma nueva para este minuto suene
}
 
function editar(id) {
    const a = alarmas.find(x => x.id === id);
    if (!a) return;
    idEditando = id;
    selDia.value = String(a.dia);
    inpHora.value = a.hora;
    inpNombre.value = a.nombre;
    tituloForm.textContent = "Editar alarma";
    btnGuardar.textContent = "Guardar cambios";
    btnCancelar.hidden = false;
    mostrarError("");
    inpHora.focus();
}
 
function borrar(id) {
    alarmas = alarmas.filter(a => a.id !== id);
    if (idEditando === id) limpiarFormulario();
    guardar();
    mostrarLista();
}
 
// ===== EVENTOS E INICIO =====
btnGuardar.addEventListener("click", guardarAlarma);
btnCancelar.addEventListener("click", limpiarFormulario);
btnDetener.addEventListener("click", detenerAlarma);
document.addEventListener("click", iniciarAudio);
 
cargar();
mostrarLista();
limpiarFormulario();
actualizarReloj();
setInterval(actualizarReloj, 1000);