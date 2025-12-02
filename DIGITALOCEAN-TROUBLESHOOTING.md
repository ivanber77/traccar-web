# Troubleshooting - Error al Cargar Aplicación en DO App Platform

## Error Reportado

```
We encountered an error when trying to load your application and your page could not be served.
```

## Posibles Causas y Soluciones

### 1. Problema con el Puerto

**Síntoma**: El servicio no responde en el puerto esperado.

**Solución**:
- Verificar que la variable `PORT` esté configurada en DO App Platform
- Verificar que `http_port` en el App Spec coincida con `PORT`
- El frontend debe escuchar en `0.0.0.0`, no en `localhost`

**Verificar en DO App Platform**:
1. Settings → App-Level Environment Variables
2. Asegúrate de que `PORT=8080` (o el puerto que DO asigne)
3. Settings → App Spec → Verifica `http_port: 8080`

### 2. Health Check Falla

**Síntoma**: El servicio inicia pero el health check falla.

**Solución**:
- Verificar que el `health_check.http_path` sea correcto (generalmente `/`)
- Verificar que el servicio responda en la ruta del health check

**Configuración recomendada**:
```yaml
health_check:
  http_path: /
  initial_delay_seconds: 10
  period_seconds: 10
  timeout_seconds: 5
  success_threshold: 1
  failure_threshold: 3
```

### 3. Problema con Vite en Producción

**Síntoma**: Vite no inicia correctamente o falla al cargar.

**Solución**: Cambiar a servir archivos estáticos compilados en lugar de Vite en modo desarrollo.

**Opción A: Usar `serve` para archivos estáticos**

1. Actualizar `package.json`:
```json
{
  "scripts": {
    "start": "serve -s build -l ${PORT:-8080}",
    "build": "vite build"
  },
  "dependencies": {
    "serve": "^14.2.1"
  }
}
```

2. Actualizar App Spec:
```yaml
build_command: npm install && npm run build
run_command: npm start
```

**Opción B: Compilar y servir desde backend**

1. Compilar localmente:
```bash
cd frontend
npm install
npm run build
```

2. Copiar al servidor:
```bash
scp -r frontend/build/* root@164.92.116.107:/opt/traccar/web/
```

3. El backend servirá el frontend en `http://164.92.116.107:8082`

### 4. Problema con Variables de Entorno

**Síntoma**: El servicio inicia pero no puede conectarse al backend.

**Solución**:
- Verificar que `VITE_API_URL` esté configurada correctamente
- Verificar que el backend esté accesible desde DO App Platform

**Verificar**:
```bash
# Desde DO App Platform (si tienes acceso SSH)
curl http://164.92.116.107:8082/api/server
```

### 5. Problema con el Dominio/DNS

**Síntoma**: El dominio no resuelve o no está configurado.

**Solución**:
1. Verificar DNS:
```bash
dig ctrack.conecty.io
nslookup ctrack.conecty.io
```

2. Verificar en DO App Platform:
   - Settings → Domains
   - Debe estar "Active" y con certificado SSL válido

## Solución Recomendada: Servir Build Estático

Para producción, es mejor servir archivos estáticos compilados en lugar de ejecutar Vite en modo desarrollo.

### Paso 1: Actualizar package.json

```json
{
  "scripts": {
    "start": "serve -s build -l ${PORT:-8080}",
    "build": "vite build"
  },
  "dependencies": {
    "serve": "^14.2.1"
  }
}
```

### Paso 2: Actualizar App Spec

```yaml
services:
  - name: frontend
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 8080
    envs:
      - key: PORT
        value: "8080"
```

### Paso 3: Verificar Build

El build debe generar una carpeta `build/` con los archivos estáticos.

## Verificación de Logs

En DO App Platform:

1. **Build Logs**: Verificar que el build se complete sin errores
2. **Runtime Logs**: Verificar que el servicio inicie correctamente
3. **Health Check Logs**: Verificar que el health check pase

## Comandos de Diagnóstico

### Verificar que el servicio responda

```bash
# Desde tu máquina local
curl https://ctrack.conecty.io
curl http://164.92.116.107:8082/api/server
```

### Verificar configuración

1. En DO App Platform → Settings → App Spec
2. Verificar:
   - `build_command`
   - `run_command`
   - `http_port`
   - `health_check`

## Próximos Pasos

1. ✅ Revisar logs en DO App Platform
2. ✅ Verificar configuración del App Spec
3. ✅ Considerar cambiar a build estático (recomendado para producción)
4. ✅ Verificar variables de entorno
5. ✅ Verificar health check configuration

