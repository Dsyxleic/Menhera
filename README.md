# Menhera — Guía de instalación

Web de rotaciones para Persona 5: The Phantom X. Tú y tu amigo podéis editar (personajes, rotaciones, puntuaciones); el resto solo puede consultar.

Tiempo estimado: 15-20 minutos, todo gratis.

---

## Paso 1 — Crear el proyecto en Supabase

1. Ve a https://supabase.com y crea una cuenta gratis (con correo o GitHub).
2. Clic en **"New project"**. Ponle nombre `menhera`, elige una contraseña de base de datos (guárdala en algún sitio) y espera ~2 minutos a que se cree.
3. Ve a **Project Settings → API**. Copia dos valores:
   - `Project URL`
   - `anon public` key

## Paso 2 — Configurar la base de datos

1. En el menú lateral de Supabase, ve a **SQL Editor → New query**.
2. Abre el archivo `sql/schema.sql` de este proyecto, copia todo su contenido y pégalo ahí.
3. Dale a **Run**. Esto crea todas las tablas, el candado de permisos (RLS) y el almacén de imágenes.

## Paso 3 — Crear tu cuenta admin (y la de tu amigo)

1. En Supabase, ve a **Authentication → Users → Add user**.
2. Crea un usuario con tu correo y una contraseña. Repite para tu amigo.
3. Copia el **UID** de cada usuario (aparece en la lista de usuarios).
4. Ve a **Table Editor → admins → Insert row**, y añade una fila por cada uno:
   - `user_id`: el UID que copiaste
   - `label`: tu nombre (opcional, solo para identificarte)

Con esto, solo esas dos cuentas podrán editar la web. Cualquier otra persona que entre solo podrá ver.

## Paso 4 — Conectar la web con tu proyecto

1. Abre `js/supabase-client.js` en este proyecto.
2. Sustituye:
   ```js
   const SUPABASE_URL = "https://TU-PROYECTO.supabase.co";
   const SUPABASE_ANON_KEY = "TU-ANON-KEY-AQUI";
   ```
   por los valores que copiaste en el Paso 1.

## Paso 5 — Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub (puede ser público o privado, ambos funcionan con Pages si tienes cuenta de pago para privado; si es gratis, que sea público — no pasa nada, la `anon key` de Supabase está pensada para ser pública, el candado real está en la base de datos, no en esconder la key).
2. Sube todos los archivos de esta carpeta al repositorio.
3. Ve a **Settings → Pages** en el repositorio, y en "Source" elige la rama `main` y carpeta `/ (root)`.
4. Espera 1-2 minutos. Tu web estará en `https://tu-usuario.github.io/nombre-repo/`.

Ese es el enlace que compartes con tus amigos. Para editar, tú y tu amigo entráis en **"Acceso admin"** con el correo y contraseña que creasteis en el Paso 3.

---

## Cómo se usa

- **Personajes** (canal 05): tú añades cada personaje con su color, imagen y su lista de skills. Esto alimenta los desplegables del Constructor.
- **Constructor** (canal 02): eliges los personajes de la rotación (columnas), añades turnos, y en cada turno añades las acciones de cada personaje. Puedes marcar una acción con ★ para resaltarla. Al guardar, puedes asociarla a un jefe y a un personaje DPS para que aparezca clasificada en la Biblioteca. También puedes exportarla como imagen.
- **Biblioteca** (canal 03): busca rotaciones guardadas, filtrando por jefe o por DPS.
- **Puntuaciones** (canal 04): crea una semana nueva y rellena las dos tablas (Compañío A / B) con 30 puestos cada una. La gente puede elegir cualquier semana pasada desde el desplegable.

## Nota sobre seguridad

Nadie más que tú y tu amigo puede escribir en la base de datos, aunque tengan el enlace de la web — esto lo garantiza Supabase (Row Level Security), no el código de la página. Aun así, no compartas tu contraseña de admin.
