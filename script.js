// ===== Panel de usuarios =====
const URL_API = "https://jsonplaceholder.typicode.com/users";

// Estado
let usuarios = [];        // array de objetos { id, nombre, correo, ciudad }
let idEnEdicion = null;   // null = modo agregar; número = modo editar

// Referencias al DOM
const formulario = document.getElementById("formulario");
const tituloFormulario = document.getElementById("titulo-formulario");
const btnEnviar = document.getElementById("btn-enviar");
const btnCancelar = document.getElementById("btn-cancelar");
const buscador = document.getElementById("buscador");
const tbody = document.getElementById("tabla-usuarios");
const mensaje = document.getElementById("mensaje");
const contador = document.getElementById("contador");
const resumenCiudades = document.getElementById("resumen-ciudades");

const campos = ["id", "nombre", "correo", "ciudad"];
const inputs = {
  id: document.getElementById("id"),
  nombre: document.getElementById("nombre"),
  correo: document.getElementById("correo"),
  ciudad: document.getElementById("ciudad"),
};

// ===== Mensajes =====
const mostrarMensaje = (texto, tipo = "") => {
  mensaje.textContent = texto;
  mensaje.className = `mensaje ${tipo}`.trim();
};

// ===== Cargar datos de la API (fetch + async/await) =====
const cargarUsuarios = async () => {
  mostrarMensaje("Cargando usuarios...", "cargando");
  try {
    const res = await fetch(URL_API);
    if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
    const datos = await res.json();

    // map(): nos quedamos solo con los campos que necesitamos
    usuarios = datos.map(({ id, name, email, address }) => ({
      id,
      nombre: name,
      correo: email,
      ciudad: address.city,
    }));

    mostrarMensaje(`Se cargaron ${usuarios.length} usuarios.`, "exito");
    actualizarVista();
  } catch (error) {
    console.error(error);
    mostrarMensaje(
      "No pudimos cargar los usuarios. Revisa tu conexión e inténtalo de nuevo.",
      "error"
    );
    actualizarVista();
  }
};

// ===== Dibujar la tabla =====
const dibujarTabla = (lista) => {
  tbody.innerHTML = "";

  if (lista.length === 0) {
    tbody.innerHTML = `<tr><td class="vacio" colspan="5">No hay usuarios para mostrar.</td></tr>`;
    return;
  }

  lista.forEach((usuario) => {
    const { id, nombre, correo, ciudad } = usuario; // destructuring
    const fila = document.createElement("tr");
    fila.innerHTML = `
      <td>${id}</td>
      <td>${escapar(nombre)}</td>
      <td>${escapar(correo)}</td>
      <td>${escapar(ciudad)}</td>
      <td class="acciones">
        <button type="button" class="btn btn-editar" data-accion="editar" data-id="${id}">Editar</button>
        <button type="button" class="btn btn-eliminar" data-accion="eliminar" data-id="${id}">Eliminar</button>
      </td>`;
    tbody.appendChild(fila);
  });
};

// Evita que el texto escrito se interprete como HTML
const escapar = (texto) =>
  String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// filter(): búsqueda en vivo sin modificar el array original
const obtenerFiltrados = () => {
  const texto = buscador.value.trim().toLowerCase();
  return usuarios.filter(({ nombre }) => nombre.toLowerCase().includes(texto));
};

// Cuenta usuarios por ciudad usando un bucle for...of
const resumirCiudades = () => {
  const conteo = {};
  for (const { ciudad } of usuarios) {
    conteo[ciudad] = (conteo[ciudad] || 0) + 1;
  }
  const partes = [];
  for (const ciudad in conteo) {
    partes.push(`${ciudad} (${conteo[ciudad]})`);
  }
  resumenCiudades.textContent = partes.length
    ? `Usuarios por ciudad: ${partes.join(", ")}`
    : "";
};

// Redibuja todo cada vez que cambia la lista
const actualizarVista = () => {
  console.log(usuarios);
  dibujarTabla(obtenerFiltrados());
  contador.textContent = `(${usuarios.length})`;
  resumirCiudades();
};

// ===== Validación =====
// Devuelve un código de resultado; el mensaje se elige con switch
const validarFormulario = ({ id, nombre, correo, ciudad }, modoEdicion) => {
  // Bucle sobre los campos para detectar vacíos
  for (const campo of campos) {
    if (inputs[campo].value.trim() === "") return `vacio:${campo}`;
  }
  if (!modoEdicion) {
    if (isNaN(Number(id))) return "id-no-numero";
    if (!Number.isInteger(Number(id)) || Number(id) <= 0) return "id-invalido";
    if (usuarios.some((u) => u.id === Number(id))) return "id-repetido";
  }
  if (!correo.includes("@")) return "correo-invalido";
  return "ok";
};

const mensajeDeValidacion = (resultado, id) => {
  const [tipo, campo] = resultado.split(":");
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

// ===== Formulario =====
const limpiarFormulario = () => {
  formulario.reset();
  inputs.id.disabled = false;
  idEnEdicion = null;
  btnEnviar.textContent = "Agregar";
  tituloFormulario.textContent = "Nuevo usuario";
  btnCancelar.hidden = true;
  campos.forEach((c) => inputs[c].classList.remove("invalido"));
};

formulario.addEventListener("submit", (event) => {
  event.preventDefault();

  const enEdicion = idEnEdicion !== null;
  const datos = {
    id: inputs.id.value.trim(),
    nombre: inputs.nombre.value.trim(),
    correo: inputs.correo.value.trim(),
    ciudad: inputs.ciudad.value.trim(),
  };

  const resultado = validarFormulario(datos, enEdicion);
  if (resultado !== "ok") {
    mostrarMensaje(mensajeDeValidacion(resultado, datos.id), "error");
    return;
  }

  const { nombre, correo, ciudad } = datos;

  if (enEdicion) {
    // Buscar por id y actualizar
    const usuario = usuarios.find((u) => u.id === idEnEdicion);
    Object.assign(usuario, { nombre, correo, ciudad });
    mostrarMensaje(`Usuario "${nombre}" actualizado correctamente.`, "exito");
  } else {
    usuarios.push({ id: Number(datos.id), nombre, correo, ciudad });
    mostrarMensaje(`Usuario "${nombre}" agregado correctamente.`, "exito");
  }

  limpiarFormulario();
  actualizarVista();
});

btnCancelar.addEventListener("click", () => {
  limpiarFormulario();
  mostrarMensaje("Edición cancelada.");
});

// ===== Buscador en vivo =====
buscador.addEventListener("input", actualizarVista);

// ===== Editar / Eliminar (delegación de eventos en el tbody) =====
tbody.addEventListener("click", (event) => {
  const boton = event.target.closest("button[data-accion]");
  if (!boton) return;

  const id = Number(boton.dataset.id);
  const { accion } = boton.dataset;

  if (accion === "editar") {
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) return;
    const { nombre, correo, ciudad } = usuario;

    idEnEdicion = id;
    inputs.id.value = id;
    inputs.id.disabled = true; // el id no se puede cambiar
    inputs.nombre.value = nombre;
    inputs.correo.value = correo;
    inputs.ciudad.value = ciudad;

    btnEnviar.textContent = "Guardar cambios";
    tituloFormulario.textContent = `Editando usuario #${id}`;
    btnCancelar.hidden = false;
    mostrarMensaje(`Editando a ${nombre}. Modifica los datos y guarda los cambios.`);
    inputs.nombre.focus();
  }

  if (accion === "eliminar") {
    const usuario = usuarios.find((u) => u.id === id);
    if (!usuario) return;

    if (confirm(`¿Eliminar a ${usuario.nombre}?`)) {
      usuarios = usuarios.filter((u) => u.id !== id);
      if (idEnEdicion === id) limpiarFormulario();
      mostrarMensaje(`Usuario "${usuario.nombre}" eliminado.`, "exito");
      actualizarVista();
    }
  }
});

// ===== Inicio =====
cargarUsuarios();