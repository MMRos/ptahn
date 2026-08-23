# 🌌 Ptahn — Interactive AI Roleplay & Storytelling Studio

Ptahn es una aplicación web de vanguardia para narrativa interactiva, rol de mesa (TTRPG) asistido por IA y creación de mundos, diseñada con un enfoque **100% soberano y local**.

---

## 🌟 Características Principales

- 🎭 **Game Master Contextual y Riguroso:** Arnés de directivas que inyecta automáticamente escenario, narrador, inventario y memorias sin alucinaciones de contexto.
- 💬 **Sintaxis Tipográfica Dinámica:** Formateo en tiempo real de diálogos (`"..."`), acciones (`*...*`), pensamientos (`~...~`), negritas (`**...**`) y entidades interactivas del compendio (`==...==`).
- 🧠 **Visualizador de Razonamiento (`<think>`):** Aislamiento y colapso de pensamientos de modelos como DeepSeek-R1.
- 🎨 **Estudio Multimodal Local:** Conexión fluida con **LM Studio**, **Pinokio / Local AI Studio (sd-vulkan)**, **Audio.cpp** y vídeo local.
- 🎙️ **Síntesis de Voz Inteligente:** Lectura de mensajes mediante voces locales o el motor de síntesis del navegador.
- 🖼️ **Editor y Recortador Canvas 2D:** Ajuste y encuadre individual y por lotes (*Batch Cropper*) para retratos (3:4) y paisajes (16:9).
- 💾 **Persistencia Dual Soberana:** Guardado automático en IndexedDB y sincronización directa con carpetas del sistema de archivos local (*File System Access API*).

---

## 📚 Documentación y Manuales

- 📖 **[Manual de Uso Completo (Guía de Usuario)](./MANUAL_DE_USO.md):** Manual detallado paso a paso sobre configuración de motores locales, creación de personajes, mecánicas de chat y atajos.

---

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+ y npm.
- Un servidor local de inferencia compatible con OpenAI API (recomendado: [LM Studio](https://lmstudio.ai/) ejecutándose en `http://localhost:1234`).

### Instalación y Ejecución

```bash
# 1. Clonar el repositorio
git clone https://github.com/MMRos/ptahn.git
cd ptahn

# 2. Instalar dependencias
npm install

# 3. Iniciar el servidor de desarrollo
npm start
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

---

## 🧪 Pruebas y Compilación

```bash
# Ejecutar todas las pruebas unitarias
npm test -- --watchAll=false

# Generar reporte de cobertura
npm test -- --coverage --watchAll=false

# Compilar para producción
npm run build
```

---

## 🏗️ Estructura del Proyecto

```
ptahn/
├── src/
│   ├── components/      # Componentes UI de React (ChatView, TopBar, Modales, Canvas Croppers)
│   ├── data/            # Plantillas predeterminadas de escenarios y activos
│   ├── pages/           # Vistas principales (Home, Create, MusicView, Profile)
│   └── utils/           # Módulos de lógica y utilidades (TTS, localAIStudio, storage, textFormatter, etc.)
├── MANUAL_DE_USO.md     # Guía integral del usuario y manual operativo
└── README.md            # Este archivo
```
