// =====================================================================
// PANEL DE USUARIOS
// Este script trae usuarios de una API, los muestra en una tabla y
// permite buscar, agregar, editar y eliminar sin recargar la página.
// =====================================================================


// ---------------------------------------------------------------------
// 1. CONSTANTES Y ESTADO
// ---------------------------------------------------------------------

// "const" se usa para valores que no se reasignan. Esta es la dirección de la API.
const URL_API = "https://jsonplaceholder.typicode.com/users";

// "let" se usa para valores que sí cambian durante la ejecución.

// Array de objetos con TODOS los usuarios. Cada uno tiene la forma:
// { id: 1, nombre: "Leanne Graham", correo: "...", ciudad: "..." }
// Es la "fuente de verdad": la tabla siempre se dibuja a partir de este array.
let usuarios = [];

// Indica en qué modo está el formulario:
//   null  -> modo "agregar" (no se está editando a nadie)
//   número -> modo "editar" (guarda el id del usuario que se está editando)
let idEnEdicion = null;


// ---------------------------------------------------------------------
// 2. REFERENCIAS AL DOM
// Guardamos los elementos de la página en variables para no tener que
// buscarlos con getElementById cada vez que los necesitemos.
// ---------------------------------------------------------------------

const formulario = document.getElementById("formulario");
const tituloFormulario = document.getElementById("titulo-formulario");
const btnEnviar = document.getElementById("btn-enviar");
const btnCancelar = document.getElementById("btn-cancelar");
const buscador = document.getElementById("buscador");
const tbody = document.getElementById("tabla-usuarios");
const mensaje = document.getElementById("mensaje");
const contador = document.getElementById("contador");
const resumenCiudades = document.getElementById("resumen-ciudades");

// Lista con los nombres de los campos del formulario.
// Nos servirá para recorrerlos con un bucle.
const campos = ["id", "nombre", "correo", "ciudad"];

// Objeto que agrupa los <input> del formulario, accesibles por nombre:
// inputs.nombre, inputs.correo, etc.
const inputs = {
  id: document.getElementById("id"),
  nombre: document.getElementById("nombre"),
  correo: document.getElementById("correo"),
  ciudad: document.getElementById("ciudad"),
};


// ---------------------------------------------------------------------
// 3. MENSAJES DE ESTADO
// ---------------------------------------------------------------------

// Muestra un texto en el <p id="mensaje">.
// "tipo" puede ser "cargando", "exito" o "error": cambia el color por CSS.
// El valor por defecto ("") deja el mensaje con el estilo neutro.
const mostrarMensaje = (texto, tipo = "") => {
  mensaje.textContent = texto;
  // Template string: mezcla texto fijo con variables usando ${ }
  mensaje.className = `mensaje ${tipo}`.trim();
};


// ---------------------------------------------------------------------
// 4. CARGAR USUARIOS DESDE LA API (fetch + async/await + JSON)
// ---------------------------------------------------------------------

// Función "async": permite usar "await" dentro, para esperar respuestas
// sin bloquear la página.
const cargarUsuarios = async () => {
  // Antes de pedir los datos, avisamos al usuario.
  mostrarMensaje("Cargando usuarios...", "cargando");

  // try/catch: si algo falla dentro del try, el código salta al catch
  // en lugar de romper el programa.
  try {
    // fetch hace la petición HTTP. "await" espera a que llegue la respuesta.
    const res = await fetch(URL_API);

    // fetch NO lanza error si el servidor responde 404 o 500,
    // así que lo revisamos nosotros con res.ok y lanzamos el error.
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);

    // res.json() convierte el cuerpo de la respuesta (texto JSON)
    // en un array de objetos de JavaScript. También es asíncrono.
    const datos = await res.json();

    // map() crea un NUEVO array transformando cada elemento.
    // La API devuelve { id, name, email, address: { city, ... }, ... }
    // y nosotros solo queremos { id, nombre, correo, ciudad }.
    // Destructuring en los parámetros: ({ id, name, email, address })
    // extrae esas propiedades directamente del objeto.
    usuarios = datos.map(({ id, name, email, address }) => ({
      id,                       // atajo de "id: id"
      nombre: name,             // renombramos name -> nombre
      correo: email,            // renombramos email -> correo
      ciudad: address.city,     // la ciudad está dentro de address
    }));

    mostrarMensaje(`Se cargaron ${usuarios.length} usuarios.`, "exito");
    actualizarVista(); // dibuja la tabla con los datos recibidos
  } catch (error) {
    // Cualquier fallo (sin internet, URL incorrecta, etc.) llega aquí.
    console.error(error); // detalle técnico para el desarrollador
    mostrarMensaje(
      "No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo.",
      "error" // mensaje amigable para el usuario
    );
    actualizarVista(); // dibuja la tabla vacía con su mensaje
  }
};


// ---------------------------------------------------------------------
// 5. DIBUJAR LA TABLA
// ---------------------------------------------------------------------

// Convierte caracteres especiales en texto seguro. Si alguien escribe
// "<script>" en el nombre, se mostrará tal cual en vez de ejecutarse.
// Es importante porque usamos innerHTML para armar las filas.
const escapar = (texto) =>
  String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// Recibe una lista de usuarios y la pinta dentro del <tbody>.
const dibujarTabla = (lista) => {
  tbody.innerHTML = ""; // borra las filas anteriores

  // Si no hay nada que mostrar, ponemos una fila con un aviso.
  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td class="vacio" colspan="5">No hay usuarios para mostrar.</td></tr>`;
    return; // salimos de la función: no hay nada más que dibujar
  }

  // forEach recorre cada usuario de la lista.
  lista.forEach((usuario) => {
    // Destructuring: sacamos las 4 propiedades del objeto en variables.
    const { id, nombre, correo, ciudad } = usuario;

    // createElement crea un <tr> nuevo que todavía no está en la página.
    const fila = document.createElement("tr");

    // Template string de varias líneas con el contenido de la fila.
    // Los botones llevan atributos data-*:
    //   data-accion -> qué hace el botón ("editar" o "eliminar")
    //   data-id     -> a qué usuario pertenece
    // Más adelante los leemos con boton.dataset.
    fila.innerHTML = `
      <td>${id}</td>
      <td>${escapar(nombre)}</td>
      <td>${escapar(correo)}</td>
      <td>${escapar(ciudad)}</td>
      <td class="acciones">
        <button type="button" class="btn btn-editar" data-accion="editar" data-id="${id}">Editar</button>
        <button type="button" class="btn btn-eliminar" data-accion="eliminar" data-id="${id}">Eliminar</button>
      </td>`;

    // appendChild agrega la fila al <tbody>; recién ahí se ve en pantalla.
    tbody.appendChild(fila);
  });
};


// ---------------------------------------------------------------------
// 6. BÚSQUEDA Y RESUMEN
// ---------------------------------------------------------------------

// Devuelve solo los usuarios cuyo nombre contiene lo escrito en el buscador.
const obtenerFiltrados = () => {
  // trim() quita espacios sobrantes; toLowerCase() ignora mayúsculas.
  const texto = buscador.value.trim().toLowerCase();

  // filter() crea un NUEVO array con los elementos que cumplen la condición.
  // El array "usuarios" original no se modifica.
  // includes("") es siempre true, así que con el buscador vacío se ven todos.
  return usuarios.filter(({ nombre }) => nombre.toLowerCase().includes(texto));
};

// Cuenta cuántos usuarios hay por ciudad usando bucles.
const resumirCiudades = () => {
  const conteo = {}; // objeto que usaremos como diccionario: { Gwenborough: 1, ... }

  // Bucle for...of: recorre cada usuario del array.
  // Con destructuring tomamos solo la ciudad.
  for (const { ciudad } of usuarios) {
    // Si la ciudad aún no existe en el objeto, (conteo[ciudad] || 0) vale 0.
    // Luego le sumamos 1.
    conteo[ciudad] = (conteo[ciudad] || 0) + 1;
  }

  // Bucle for...in: recorre las claves (nombres de ciudad) del objeto.
  const partes = [];
  for (const ciudad in conteo) {
    partes.push(`${ciudad} (${conteo[ciudad]})`);
  }

  // Si hay datos, join(", ") une las partes en un solo texto separado por comas.
  resumenCiudades.textContent = partes.length
    ? `Usuarios por ciudad: ${partes.join(", ")}`
    : "";
};

// Función central: se llama cada vez que la lista cambia.
// Así todo (tabla, contador, resumen) siempre queda sincronizado.
const actualizarVista = () => {
  console.log(usuarios); // requisito: imprimir el array completo en cada cambio
  dibujarTabla(obtenerFiltrados());
  contador.textContent = `(${usuarios.length})`;
  resumirCiudades();
};


// ---------------------------------------------------------------------
// 7. VALIDACIÓN DEL FORMULARIO
// ---------------------------------------------------------------------

// Revisa los datos y devuelve un "código" que describe el resultado:
//   "ok" si todo está bien, o el motivo del error (ej. "id-repetido").
// Separar la validación del mensaje hace el código más ordenado.
// "modoEdicion" es true cuando se edita: ahí el id no se valida porque
// está bloqueado y ya existe a propósito.
const validarFormulario = ({ id, nombre, correo, ciudad }, modoEdicion) => {
  // Bucle sobre los nombres de campo: si alguno está vacío, avisamos cuál.
  for (const campo of campos) {
    // Si estamos editando, el id está deshabilitado pero tiene valor, así que pasa.
    if (inputs[campo].value.trim() === "") return `vacio:${campo}`;
  }

  if (!modoEdicion) {
    // Number("abc") da NaN (Not a Number); isNaN lo detecta.
    if (isNaN(Number(id))) return "id-no-numero";

    // Debe ser entero (no 2.5) y mayor que cero.
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) return "id-invalido";

    // some() devuelve true si ALGÚN usuario cumple la condición.
    // Aquí revisa si ya existe ese id (incluye los que vinieron de la API).
    if (usuarios.some((u) => u.id === Number(id))) return "id-repetido";
  }

  // El correo debe contener "@".
  if (!correo.includes("@")) return "correo-invalido";

  return "ok"; // pasó todas las validaciones
};

// Traduce el código de resultado a un mensaje legible.
const mensajeDeValidacion = (resultado, id) => {
  // Algunos códigos traen dato extra, como "vacio:nombre".
  // split(":") los separa en ["vacio", "nombre"] y los destructuramos.
  const [tipo, campo] = resultado.split(":");

  // switch elige un caso según el valor de "tipo".
  switch (tipo) {
    case "vacio":
      return `El campo "${campo}" no puede estar vacío.`;
    case "id-no-numero":
      return "El id debe ser un número.";
    case "id-invalido":
      return "El id debe ser un número entero positivo.";
    case "id-repetido":
      return `Ya existe un usuario con el id ${id}`;
    case "correo-invalido":
      return 'El correo debe contener "@".';
    default:
      return "";
  }
};


// ---------------------------------------------------------------------
// 8. FORMULARIO: AGREGAR Y MODIFICAR
// ---------------------------------------------------------------------

// Deja el formulario como al principio: vacío y en modo "agregar".
const limpiarFormulario = () => {
  formulario.reset();                       // vacía todos los campos
  inputs.id.disabled = false;               // desbloquea el id
  idEnEdicion = null;                       // volvemos al modo agregar
  btnEnviar.textContent = "Agregar";        // el botón vuelve a su texto original
  tituloFormulario.textContent = "Nuevo usuario";
  btnCancelar.hidden = true;                // el botón Cancelar solo existe al editar
  campos.forEach((c) => inputs[c].classList.remove("invalido"));
};

// Evento "submit": se dispara al presionar el botón del formulario
// o al pulsar Enter dentro de un campo.
formulario.addEventListener("submit", (event) => {
  // preventDefault evita que el navegador recargue la página,
  // que es su comportamiento normal al enviar un formulario.
  event.preventDefault();

  // ¿Estamos editando? (idEnEdicion es un número) ¿o agregando? (es null)
  const enEdicion = idEnEdicion !== null;

  // Leemos los valores. En modo edición el id está deshabilitado,
  // pero su .value sigue disponible.
  const datos = {
    id: inputs.id.value.trim(),
    nombre: inputs.nombre.value.trim(),
    correo: inputs.correo.value.trim(),
    ciudad: inputs.ciudad.value.trim(),
  };

  // Validamos y, si algo falla, mostramos el mensaje y salimos con return
  // (así no se agrega ni modifica nada).
  const resultado = validarFormulario(datos, enEdicion);
  if (resultado !== "ok") {
    mostrarMensaje(mensajeDeValidacion(resultado, datos.id), "error");
    return;
  }

  const { nombre, correo, ciudad } = datos; // destructuring

  if (enEdicion) {
    // MODIFICAR: find() devuelve el primer usuario cuyo id coincide.
    // Como es un objeto, al modificarlo cambiamos el que está dentro del array.
    const usuario = usuarios.find((u) => u.id === idEnEdicion);

    // Object.assign copia las propiedades indicadas sobre el objeto existente.
    Object.assign(usuario, { nombre, correo, ciudad });
    mostrarMensaje(`Usuario "${nombre}" actualizado correctamente.`, "exito");
  } else {
    // AGREGAR: el id llega como texto, lo pasamos a número con Number().
    // push() añade el nuevo objeto al final del array.
    usuarios.push({ id: Number(datos.id), nombre, correo, ciudad });
    mostrarMensaje(`Usuario "${nombre}" agregado correctamente.`, "exito");
  }

  limpiarFormulario(); // vacía el formulario y vuelve el botón a "Agregar"
  actualizarVista();   // redibuja la tabla con los cambios
});

// Botón "Cancelar": abandona la edición sin guardar nada.
btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("Edición cancelada.");
});


// ---------------------------------------------------------------------
// 9. BUSCADOR EN VIVO
// ---------------------------------------------------------------------

// El evento "input" se dispara con cada tecla escrita (o borrada).
// Llamamos a actualizarVista, que usa obtenerFiltrados() internamente.
buscador.addEventListener("input", actualizarVista);


// ---------------------------------------------------------------------
// 10. BOTONES EDITAR / ELIMINAR (delegación de eventos)
// ---------------------------------------------------------------------

// Las filas se crean dinámicamente, así que no podemos ponerle un listener
// a cada botón de antemano. En su lugar ponemos UN solo listener en el
// <tbody>: los clics en los botones "suben" (burbujean) hasta él.
tbody.addEventListener("click", (event) => {
  // event.target es el elemento exacto donde se hizo clic.
  // closest() busca hacia arriba el botón con data-accion más cercano.
  // Si el clic no fue en un botón, devuelve null y salimos.
  const boton = event.target.closest("button[data-accion]");
  if (!boton) return;

  // dataset lee los atributos data-*. Siempre son texto, por eso Number().
  const id = Number(boton.dataset.id);
  const { accion } = boton.dataset; // "editar" o "eliminar"

  // ----- EDITAR -----
  if (accion === "editar") {
    // Buscamos el usuario por su id.
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) return;
    const { nombre, correo, ciudad } = usuario;

    idEnEdicion = id; // activamos el modo edición

    // Cargamos los datos del usuario en el formulario.
    inputs.id.value = id;
    inputs.id.disabled = true; // bloqueado: el id no se puede cambiar
    inputs.nombre.value = nombre;
    inputs.correo.value = correo;
    inputs.ciudad.value = ciudad;

    // Cambiamos textos para que se note que estamos editando.
    btnEnviar.textContent = "Guardar cambios";
    tituloFormulario.textContent = `Editando usuario #${id}`;
    btnCancelar.hidden = false;
    mostrarMensaje(`Editando a ${nombre}. Modifica los datos y guarda los cambios.`);
    inputs.nombre.focus(); // ponemos el cursor listo para escribir
  }

  // ----- ELIMINAR -----
  if (accion === "eliminar") {
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) return;

    // confirm() muestra un cuadro Aceptar/Cancelar y devuelve true o false.
    if (confirm(`¿Eliminar a ${usuario.nombre}?`)) {
      // filter() deja todos los usuarios EXCEPTO el que tiene ese id.
      // Reasignamos el array (por eso "usuarios" se declaró con let).
      usuarios = usuarios.filter((u) => u.id !== id);

      // Si justo se estaba editando al usuario eliminado, limpiamos el formulario.
      if (idEnEdicion === id) limpiarFormulario();

      mostrarMensaje(`Usuario "${usuario.nombre}" eliminado.`, "exito");
      actualizarVista();
    }
  }
});


// ---------------------------------------------------------------------
// 11. INICIO
// ---------------------------------------------------------------------

// Al cargar la página (el script está al final del <body>, así que el HTML
// ya existe) pedimos los usuarios a la API.
cargarUsuarios();