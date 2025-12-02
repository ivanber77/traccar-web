# Fix para Error "vite: not found" en DigitalOcean App Platform

## Problema

```
sh: 1: vite: not found
ERROR failed health checks
```

## Causa

El comando `vite` no se encuentra en el PATH durante la ejecución. Esto puede deberse a:

1. Las dependencias no están instaladas en el entorno de ejecución
2. El script `npm start` no encuentra `vite` en `node_modules/.bin`
3. El build no incluye `node_modules` en producción

## Solución Aplicada

### 1. Movido `vite` a `dependencies`

El problema era que `vite` estaba en `devDependencies`, y en producción DO App Platform podría no instalar devDependencies. Ahora `vite` y sus plugins están en `dependencies`:

```json
"dependencies": {
  ...
  "vite": "^7.2.6",
  "@vitejs/plugin-react-swc": "^4.2.2",
  "vite-plugin-pwa": "^1.2.0",
  "vite-plugin-static-copy": "^3.1.4",
  "vite-plugin-svgr": "^4.5.0"
}
```

**Por qué funciona**: Las dependencias siempre se instalan, asegurando que `vite` esté disponible en producción.

### 2. Actualizado scripts

Los scripts ahora usan `vite` directamente (sin `npx`):

```json
"scripts": {
  "start": "vite --host",
  "dev": "vite --host",
  "build": "vite build"
}
```

**Por qué funciona**: Con `vite` en `dependencies`, está disponible directamente en `node_modules/.bin/vite`.

## Configuración Recomendada para DO App Platform

### App Spec Completo

```yaml
name: conectytrack-frontend
region: nyc
domains:
  - domain: ctrack.conecty.io
    type: PRIMARY
    certificate: LETS_ENCRYPT
services:
  - name: frontend
    github:
      repo: tu-usuario/tu-repo
      branch: main
      deploy_on_push: true
    source_dir: /
    build_command: npm ci && npm run build
    run_command: npm start
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 8080
    health_check:
      http_path: /
    routes:
      - path: /
    envs:
      - key: PORT
        value: "8080"
        scope: RUN_TIME
        type: SECRET
      - key: VITE_API_URL
        value: "http://164.92.116.107:8082"
        scope: RUN_TIME
        type: SECRET
      - key: NODE_ENV
        value: "production"
        scope: RUN_TIME
        type: SECRET
```

### Variables de Entorno

En DO App Platform → **Settings** → **App-Level Environment Variables**:

```
PORT=8080
VITE_API_URL=http://164.92.116.107:8082
NODE_ENV=production
```

## Alternativa: Usar Build de Producción

Si prefieres servir archivos estáticos en lugar de usar Vite en modo desarrollo:

### Opción 1: Servir Build Estático con `serve`

1. Instalar `serve`:
   ```json
   "scripts": {
     "start": "npx serve -s build -l 8080",
     "build": "npx vite build"
   }
   ```

2. O agregar `serve` como dependencia:
   ```bash
   npm install --save serve
   ```

### Opción 2: Usar el Backend para Servir el Frontend

1. Compilar el frontend:
   ```bash
   cd frontend
   npm run build
   ```

2. Copiar a `/opt/traccar/web/` en el servidor:
   ```bash
   scp -r frontend/build/* root@164.92.116.107:/opt/traccar/web/
   ```

3. El backend servirá el frontend en `http://164.92.116.107:8082`

## Verificación

Después de aplicar los cambios:

1. **Verificar que el build funcione**:
   - En DO App Platform → **Build Logs**
   - Debe completar sin errores

2. **Verificar que el servicio inicie**:
   - En DO App Platform → **Runtime Logs**
   - Debe mostrar: `VITE v7.2.6 ready in XXX ms`

3. **Verificar health check**:
   - En DO App Platform → **Overview**
   - El servicio debe estar "Healthy"

## Troubleshooting

### Si sigue fallando

1. **Verificar que `node_modules` esté presente**:
   - En DO App Platform, el build debe instalar dependencias
   - Verifica que `npm ci` o `npm install` se ejecute correctamente

2. **Verificar versión de Node.js**:
   - DO App Platform debe usar Node.js 18+ o 22+
   - Configura en **Settings** → **App Spec**:
     ```yaml
     environment_slug: node-js
     ```

3. **Usar build estático**:
   - Si Vite en modo desarrollo sigue fallando, usa la Opción 2 (servir desde backend)

