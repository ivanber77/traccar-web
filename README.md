# Frontend Traccar - Proyecto Personalizado

Frontend React/Vite del sistema de rastreo GPS Traccar.

## Requisitos

- Node.js 18+ 
- npm o yarn

## Desarrollo Local

### Iniciar servidor de desarrollo

```bash
# Conectado a backend local
./dev.sh

# O conectado a backend remoto
./dev.sh http://164.92.116.107:8082
```

Esto:
- Instala dependencias si es necesario
- Inicia servidor de desarrollo con hot reload
- Se conecta al backend especificado

### Compilar para producción

```bash
./build.sh
```

Genera `build/` o `dist/` con archivos estáticos listos para desplegar.

## Estructura

```
frontend/
├── src/               # Código fuente React
│   ├── main/         # Página principal
│   ├── settings/     # Configuraciones
│   ├── reports/      # Reportes
│   └── map/          # Componentes de mapa
├── public/           # Archivos estáticos
└── build/           # Build de producción (generado)
```

## Personalización

### Modificar UI

1. Editar componentes en `src/`
2. Los cambios se reflejan automáticamente con hot reload
3. Probar en navegador

### Conectar a Backend

El frontend se conecta al backend mediante:

1. **Variable de entorno** (recomendado):
   ```bash
   export VITE_API_URL=http://localhost:8082/api
   ./dev.sh
   ```

2. **Configuración en código**:
   Editar `src/store/base.js` o archivo de configuración

### Cambiar Tema/Estilos

- Editar `src/common/theme/`
- Modificar `src/AppThemeProvider.jsx`

## Tecnologías

- React 19
- Vite (build tool)
- Material-UI
- MapLibre GL (mapas)
- Redux Toolkit

## Scripts Disponibles

- `npm start` - Desarrollo
- `npm run build` - Compilación producción
- `npm run lint` - Linter

## Despliegue

1. Compilar: `./build.sh`
2. Copiar `build/` a servidor en `/opt/traccar/web/`
3. O integrar en build del backend
