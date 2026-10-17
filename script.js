
const botonContacto = document.getElementById("botonContacto");
const opcionesContacto = document.getElementById("opcionesContacto");
const flecha = document.getElementById("flecha");

botonContacto.addEventListener("click", function () {

    if (opcionesContacto.hidden) {
        opcionesContacto.hidden = false;
        botonContacto.setAttribute("aria-expanded", "true");
        flecha.textContent = "−";
    } else {
        opcionesContacto.hidden = true;
        botonContacto.setAttribute("aria-expanded", "false");
        flecha.textContent = "＋";
    }

});
