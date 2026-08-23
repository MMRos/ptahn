# 📖 Ptahn — Manual de Uso y Guía de Operación

Bienvenido a **Ptahn**, la plataforma de rol interactivo, narrativa inmersiva y creación de mundos impulsada por Inteligencia Artificial local y soberana.

---

## 📑 Tabla de Contenidos
1. [Introducción y Filosofía](#1-introducción-y-filosofía)
2. [Requisitos y Configuración de Motores de IA Locales](#2-requisitos-y-configuración-de-motores-de-ia-locales)
3. [Taller de Creación (Mundos, Personajes y Narradores)](#3-taller-de-creación-mundos-personajes-y-narradores)
4. [Modo Aventura y Sistema de Chat](#4-modo-aventura-y-sistema-de-chat)
5. [Sintaxis Tipográfica Interactiva](#5-sintaxis-tipográfica-interactiva)
6. [Encuadre y Gestión Multimedia (Imágenes y Sonido)](#6-encuadre-y-gestión-multimedia-imágenes-y-sonido)
7. [Persistencia y Almacenamiento Soberano](#7-persistencia-y-almacenamiento-soberano)
8. [Configuración de Idiomas y Preferencias Globales](#8-configuración-de-idiomas-y-preferencias-globales)
9. [Solución de Problemas Frecuentes](#9-solución-de-problemas-frecuentes)

---

## 1. Introducción y Filosofía

**Ptahn** está diseñado para que creadores, jugadores de rol y escritores disfruten de aventuras interactivas donde la IA actúa como un **Game Master (Director de Juego)** riguroso, consistente y adaptativo.

- **100% Privado y Local:** Tus historias, fichas de personaje, imágenes y audios se procesan y almacenan en tu propio equipo.
- **Multimodal Integral:** Conecta modelos de lenguaje (LLM), generadores de arte (SDXL/sd-vulkan), síntesis de voz (TTS/Audio.cpp) y generación de vídeo local.
- **Compendio Dinámico:** A medida que juegas, la IA detecta nuevas entidades, lugares y personajes para añadirlos al lore interactivo de la historia.

---

## 2. Requisitos y Configuración de Motores de IA Locales

Ptahn se conecta a servidores locales a través de endpoints estándar de OpenAI-compatible API y herramientas de orquestación como **LM Studio** o **Pinokio**:

### 2.1 Servidor LLM (LM Studio / vLLM / Ollama)
1. Inicia tu servidor local en **LM Studio** (puerto por defecto: `http://localhost:1234`).
2. Carga un modelo instruct/chat optimizado para rol (ej. *Mistral, Llama-3, Qwen 2.5, DeepSeek-R1*).
3. En la barra superior de Ptahn (**TopBar**), haz clic en el selector de conexión y verifica el indicador verde de estado (`Conectado`).

### 2.2 Generación de Imágenes (Pinokio / sd-vulkan / ComfyUI)
- **Puerto:** `http://localhost:7860` (o el configurado en Ajustes).
- Soporta pipelines SDXL Turbo y SD 1.5 con aceleración Vulkan o CUDA.
- Ptahn enriquece automáticamente tus descripciones con iluminación volumétrica y estética cinematográfica.

### 2.3 Síntesis y Efectos de Audio (Audio.cpp / LM Studio Audio / Web Speech API)
- **Modo Navegador:** Funciona inmediatamente utilizando las voces nativas del sistema operativo.
- **Modo Servidor Local:** Conéctate a un endpoint compatible (`/v1/audio/speech`) en el puerto `http://localhost:8880` para voces neuronales avanzadas.

---

## 3. Taller de Creación (Mundos, Personajes y Narradores)

Desde el menú lateral o el botón **Crear (+)** puedes acceder al taller de creación:

### 3.1 Creación de Escenarios y Aventuras
- **Título y Sinopsis:** Define el trasfondo inicial de tu campaña.
- **Portada e Iluminación:** Genera portadas con IA seleccionando presets como *Fantasía Oscura, Cyberpunk, Realismo Mágico, Anime*, etc.
- **Reglas del Mundo:** Puedes definir leyes físicas, nivel tecnológico o presencia de magia que la IA respetará durante toda la partida.

### 3.2 Personajes y Entidades
- **Generación Contextual de Lore:** Al crear un personaje a partir de una descripción breve, la IA situará automáticamente al personaje dentro de la trama y lugar del escenario activo en lugar de generar biografías genéricas.
- **Ficha de Atributos:** Asigna rol, facción, rasgos psicológicos, inventario y relaciones.
- **Galería y Expresiones:** Sube o genera múltiples retratos para reflejar estados de ánimo (Normal, Alegre, Enfadado, Combate).

### 3.3 Narradores Personalizados
- Asigna personalidades de Game Master (ej. *Narrador Épico, Despiadado, Misterioso, Cómico*).
- Configura el tono de voz, velocidad (rate), tono (pitch) y motor de síntesis preferido.

---

## 4. Modo Aventura y Sistema de Chat

El corazón de Ptahn es su vista de chat dinámico ([`ChatView`](file:///c:/workspace/ptahn/src/components/ChatView.jsx)):

1. **Arnés de Contexto (System Prompt Inviolable):** La IA recibe en cada turno un compendio estructurado con el escenario, narrador, perfil del jugador, inventario y memorias clave.
2. **Razonamiento en Vivo (`<think>`):** Si usas modelos con cadena de pensamiento (como DeepSeek-R1), Ptahn aísla el bloque de razonamiento en un desplegable colapsable para mantener la lectura limpia.
3. **Control de Turnos y Edición:**
   - Puedes editar cualquier mensaje anterior para corregir el rumbo narrativo.
   - Botón **Reintentar / Regenerar** para obtener una respuesta alternativa del narrador.
   - **Ramificación (`Branch Chat`):** Duplica la conversación en un punto clave para explorar decisiones alternativas sin perder tu línea temporal original.
4. **Auto-Detección y Staging de Entidades:**
   - La IA destaca términos clave con `==...==`.
   - Si la opción de auto-generación está activa, la IA preparará tarjetas de compendio en el botón de **Staging (Borrador)** para que las revises y las incorpores al mundo con un clic.

---

## 5. Sintaxis Tipográfica Interactiva

Ptahn incluye formateadores visuales enriquecidos con botones de acceso rápido sobre la caja de texto:

| Sintaxis | Ejemplo | Renderizado | Uso |
| :--- | :--- | :--- | :--- |
| `"..."` | `"¡Deténte ahí!"` | <span style="color:#ffd36b">💬 Diálogo</span> | Palabras habladas por personajes o PNJs |
| `*...*` | `*Desenvaina su espada lentamente*` | <span style="color:#6ee7b7">🏃 Acción</span> | Descripciones físicas y eventos ambientales |
| `~...~` | `~Esto no me da buena espina...~` | <span style="color:#c084fc">🧠 Pensamiento</span> | Monólogo interno del personaje |
| `**...**` | `**Peligro Crítico**` | **Negrita** | Énfasis importante |
| `==...==` | `==Vallebruma==` | ✨ Resaltado | Términos clave o enlaces interactivos a tarjetas del compendio |

> 💡 **Consejo:** Al hacer clic sobre cualquier término resaltado `==Nombre==`, se abrirá un popup informativo con los detalles de esa entidad si ya existe en tu compendio, o una opción para crearla al instante.

---

## 6. Encuadre y Gestión Multimedia (Imágenes y Sonido)

Ptahn cuenta con un sistema de recorte en Canvas 2D en tiempo real:

- **Modo Individual ([`ImageCropperModal`](file:///c:/workspace/ptahn/src/components/ImageCropperModal.jsx)):** Encuadra imágenes verticales (3:4 para personajes) o panorámicas (16:9 para escenarios) con zoom, desplazamiento libre y exportación HD a 960px/600px.
- **Modo por Lotes ([`BatchCropperModal`](file:///c:/workspace/ptahn/src/components/BatchCropperModal.jsx)):** Ajusta múltiples retratos de expresiones a la vez, asigna etiquetas rápidas (*Alegre, Enfadado, Combate*) y marca cuál será la imagen por defecto.
- **Audio y Narración:** Cada mensaje del chat cuenta con un botón de altavoz que sintetiza la respuesta con la voz y parámetros del narrador activo.

---

## 7. Persistencia y Almacenamiento Soberano

- **Base de Datos Local (IndexedDB):** Tus partidas se guardan automáticamente en tu navegador sin límite de tamaño de sesión.
- **Exportación a Carpeta Local (File System Access API):**
  - Puedes vincular una carpeta de tu disco duro para que Ptahn guarde tus campañas en archivos JSON transparentes y legibles.
  - Esto facilita hacer copias de seguridad en Google Drive, Dropbox, o clonar tus campañas en otros equipos.

---

## 8. Configuración de Idiomas y Preferencias Globales

Desde el panel de configuración (**TopBar > Ajustes**):
- **Idioma del Asistente:** Puedes fijar un idioma estricto de respuesta (Español, Inglés, Francés, Alemán, etc.) o dejarlo en **Auto-Detectar** para que la IA responda automáticamente en el idioma en que le hables.
- **Andamiaje del LLM:** Todas las instrucciones del sistema y arneses de rol se comunican internamente al modelo en inglés de alto rendimiento, garantizando máxima fidelidad y velocidad en cualquier LLM moderno.

---

## 9. Solución de Problemas Frecuentes

1. **El indicador de conexión está en rojo:**
   - Asegúrate de que LM Studio o tu servidor local esté encendido con el servidor API iniciado.
   - Verifica en Ajustes que el puerto (`http://localhost:1234`) sea el correcto.
2. **Las imágenes generadas salen completamente oscuras:**
   - La opción de *Fantasía Oscura* aplica presets con claroscuro y luces volumétricas. Si deseas más luminosidad, prueba el preset *Fantasía Épica* o *Realismo Mágico*.
3. **No se escucha la voz del narrador:**
   - Si no tienes un servidor local de audio activo, Ptahn usará automáticamente las voces del sistema operativo. Asegúrate de permitir el audio en tu navegador.
