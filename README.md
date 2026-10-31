# Baldi’s Basics: El Aula Cero · v1.2

Fangame de terror en primera persona, en español y creado para una game jam. Cinco cuadernos, una escuela alterada por tus errores y un profesor que escucha cada carrera.

## Jugar

Abre `index.html` en un navegador de escritorio moderno. El botón de inicio activa el audio; haz clic en la vista para capturar el ratón. Si el navegador limita archivos locales, ejecuta desde esta carpeta:

```sh
python3 -m http.server 8080
```

Después entra en `http://localhost:8080`.

No hay instalación, compilación, cuentas ni dependencias externas descargadas durante la partida. Los archivos de imagen y sonido incluidos se cargan desde la misma carpeta del juego.

En móviles aparecen botones táctiles para desplazarse, girar, interactuar, correr, abrir el plano y pausar. En escritorio puedes usar las flechas para mirar si la captura del ratón no está disponible.

### Controles

| Acción | Tecla |
| --- | --- |
| Moverse | W A S D |
| Mirar | Ratón o flechas izquierda/derecha |
| Interactuar | E |
| Correr | Shift |
| Mostrar mapa | Q |
| Diario de recuerdos | J |
| Pantalla completa | F |
| Silenciar | M |
| Pausar / soltar ratón | Esc |

### Ajustes y accesibilidad

En **Ajustes** puedes cambiar volumen general, volumen de ambiente, sensibilidad y resolución (480, 640 u 800 px). La opción **Reducir movimiento** elimina el balanceo decorativo y las líneas de monitor. Las opciones y los finales descubiertos se guardan en este navegador; el juego también funciona cuando el almacenamiento está desactivado.

**Esc** permite cerrar un cuaderno sin consumirlo. Las respuestas deben ser números enteros; los errores de formato no cuentan como fallos. El diario (**J**) permite releer los recuerdos recuperados. La partida, el reloj y la persecución se detienen al abrir menús, leer o cambiar de pestaña. El progreso de una partida no se conserva al cerrar o recargar la página.

### Objetivo e historia

Vuelves a la escuela por un cuaderno y encuentras tu nombre en el registro de alumnos borrados. Reúne cinco cuadernos y resuelve sus ejercicios. Las respuestas incorrectas aumentan la presión y revelan atajos. Correr produce ruido; el timbre puede distraer a Baldi.

Hay dos finales: escapa por la entrada con los cinco cuadernos o investiga el Aula Cero para revelar lo que la escuela ha escondido. Las notas de los cuadernos contienen el contexto de ese segundo desenlace.

## Publicar en GitHub Pages

### Opción rápida: desde una rama

1. Crea un repositorio público en GitHub.
2. Sube **el contenido de esta carpeta**, no la carpeta contenedora. `index.html` debe quedar en la raíz del repositorio. Conserva `.nojekyll`.
3. Para usar esta opción sin el despliegue automático, elimina `.github/workflows/pages.yml` antes de subir los archivos.
4. Abre **Settings → Pages → Build and deployment**.
5. Elige **Deploy from a branch**, rama **main**, carpeta **/(root)** y pulsa **Save**.
6. Cuando GitHub termine la publicación, la dirección aparece en esa misma pantalla. Normalmente tendrá la forma `https://TU_USUARIO.github.io/TU_REPOSITORIO/`.

Los archivos usan rutas relativas y funcionan también bajo el nombre de un repositorio.

### Opción automática: GitHub Actions

1. Sube todos los archivos, incluida la carpeta oculta `.github`.
2. En **Settings → Pages → Source**, elige **GitHub Actions**.
3. Ejecuta **Actions → Publicar Aula Cero → Run workflow**, o sube un cambio a `main`.
4. El flujo incluido publica únicamente `index.html`, `engine.js`, `game.js`, `style.css`, la carpeta `assets/` y `.nojekyll`. La URL aparece en el despliegue de **github-pages**.

Guía oficial: [Publicar con flujos de GitHub Actions](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Créditos

Este es un **fangame no oficial**, sin afiliación con el juego original. Baldi y Baldi’s Basics pertenecen a sus respectivos titulares; el creador original es **mystman12 / Basically Games**. El mapa y el lore del Aula Cero son originales. Esta edición incluye sprites, texturas y sonidos originales de **Baldi’s Basics Classic**, no los assets exclusivos de Classic Remastered. La carpeta `assets/manifest.json` registra el origen y SHA-256 de cada archivo; `assets/CREDITS.md` detalla los créditos.

Consulta las reglas de tu game jam sobre fangames y personajes preexistentes antes de presentar una entrada.


## Cambios de v1.1

- Cronómetro real: responder ya no añade segundos ficticios.
- Movimiento barrido para evitar atravesar paredes y entradas no finitas controladas.
- Baldi completa esquinas sin quedarse atascado; captura con visibilidad.
- Carrera con recuperación mínima de resistencia, sin aceleración entrecortada.
- Temporizadores del timbre coherentes durante la gracia inicial.
- Audio detenido al pausar, cambiar de pantalla o salir de la pestaña.
- Búferes gráficos reutilizados, muestreo de suelo/techo optimizado y menús sin renderizado continuo innecesario.
- Cámara adaptada a la proporción de pantalla y animación sincronizada con la regla.
- Reintento y progreso de carga; compatibilidad con apertura local sin lectura de píxeles cuando el navegador la bloquea.
- Ajustes persistentes, diario, objetivos, finales descubiertos, navegación por teclado y controles táctiles.

## Pruebas reproducibles

Desde esta carpeta, con Node.js:

```sh
node --check engine.js
node --check game.js
node test-engine.cjs
node test-regressions.cjs
node test-audio.cjs
```

Resultados de esta versión: **31/31** pruebas del motor, **3/3** regresiones y **7/7** comprobaciones de audio. Las pruebas incluyen rutas con movimiento y colisiones hasta ambos finales, y salida normal a 30, 60 y 120 actualizaciones por segundo. La comprobación de interfaz se realizó en Chromium de escritorio y emulación móvil; no equivale a probar todos los navegadores o dispositivos.


## Cambios de v1.2 — ambiente y captura

- Ambiente original de 24 segundos en bucle: ventilación, zumbido eléctrico y tuberías lejanas. Se detiene en pausa y menús y tiene volumen independiente.
- Jumpscare visual de 1,35 segundos al atraparte, acompañado por el grito original de Baldi; después aparece el resultado. La opción de movimiento reducido mantiene la imagen estática.
- Regla más fuerte: versión comprimida del sonido original, con +3,37 dB RMS en el archivo y menor atenuación por distancia. El archivo original permanece intacto.
- El volumen general y M siguen controlando todos los sonidos.
