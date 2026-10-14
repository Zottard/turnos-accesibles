# Marca — Turnos Accesibles · Karma Tech

Guía corta de identidad. Los colores y tipografías de acá son los mismos que usa la app
(`app/assets/css/tokens.css`) y el documento PDF.

## Idea

**Karma Tech** es el equipo. *Karma*: lo que das vuelve. Hacemos tecnología para que nadie
quede afuera de un trámite esencial.

**Turnos Accesibles** es el producto: una capa amable sobre los sistemas de turnos de salud
pública. La marca tiene que transmitir **calidez, claridad y confianza**. Colorida, pero nunca
ruidosa: cada color tiene un trabajo y todos pasan contraste AA.

## Logos

| Archivo | Uso |
|---|---|
| `public/logo.svg` | Logo del producto (ícono + nombre). Header de la app, portada del PDF. |
| `public/icono.svg` | Solo el ícono. Favicon, PWA, avatar. |
| `public/karma-tech.svg` | Logo del equipo. Pie de la app, portada y contratapa del PDF. |

- **Ícono del producto:** un calendario de esquinas redondeadas (violeta) con dos argollas
  amarillas y un tilde blanco. A la derecha, dos ondas de sonido coral: el turno que *se escucha*.
- **Karma Tech:** un anillo dividido en cuatro colores (turquesa, sol, coral, violeta) que gira
  sobre sí mismo, con una flecha que vuelve al inicio. Al lado, el nombre en Lexend.
- Área de respeto: la altura del tilde alrededor de todo el logo. Tamaño mínimo del ícono: 24 px.
- No deformar, no rotar, no cambiar los colores del anillo, no poner el logo sobre fotos.

## Color

| Token | Hex | Rol | Contraste |
|---|---|---|---|
| `--color-violeta` | `#5B2BD9` | Primario: botones, enlaces, foco | 7,2:1 sobre crema |
| `--color-violeta-oscuro` | `#3F1A9E` | Hover, texto sobre fondos suaves | 10,8:1 |
| `--color-turquesa` | `#0B7A75` | Éxito, confirmaciones, "disponible" | 4,9:1 |
| `--color-coral` | `#C2410C` | Avisos, recordatorios, voz | 4,9:1 |
| `--color-sol` | `#FFC233` | Acento decorativo y resaltados. **Solo con texto tinta encima.** | 10,7:1 con tinta |
| `--color-rosa` | `#C0266D` | Errores y cancelaciones | 5,4:1 |
| `--color-tinta` | `#1E1633` | Texto principal | 16,5:1 |
| `--color-tinta-suave` | `#4A4160` | Texto secundario | 9,0:1 |
| `--color-crema` | `#FFF9F0` | Fondo de la app | — |
| `--color-blanco` | `#FFFFFF` | Tarjetas | — |

Cada color tiene su versión **suave** (10 % sobre crema) para fondos de tarjetas y avisos.

**Alto contraste:** fondo negro `#000`, texto blanco, primario amarillo `#FFE14D`, bordes blancos
de 3 px. Se activa desde el menú de accesibilidad.

## Tipografía

- **Lexend** (títulos, botones). Diseñada para facilitar la lectura y reducir el esfuerzo visual.
- **Atkinson Hyperlegible** (texto). Creada por el Braille Institute para personas con baja
  visión: cada letra se distingue de las parecidas (`I l 1`, `O 0`).
- Nada por debajo de 18 px en la app. Interlineado 1,6. Líneas de 70 caracteres como máximo.

## Forma

- Esquinas redondeadas generosas (14 px en tarjetas, 999 px en botones).
- Objetivos táctiles de 56 px de alto como mínimo.
- Foco siempre visible: anillo de 4 px en sol con borde tinta.
- Sombras suaves, sin degradados detrás del texto, sin animaciones salvo transiciones cortas
  (y ninguna si la persona eligió reducir el movimiento).

## Tono y voz

- Hablamos de **vos**, con frases cortas. Un dato por oración.
- Decimos qué pasó y qué hacer: *"Ese turno ya lo tomó otra persona. Te mostramos otros cerca."*
- Nada de vocabulario administrativo sin explicar. "Prestador" → "centro de salud".
- Nunca culpamos a la persona: *"No encontramos ese correo"*, no *"Correo inválido"*.
