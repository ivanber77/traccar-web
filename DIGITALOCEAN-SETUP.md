# Configuración para DigitalOcean App Platform

## Problema Actual

El frontend está corriendo pero no es accesible desde fuera. Esto puede deberse a:

1. **Puerto incorrecto**: DO App Platform asigna un puerto dinámico
2. **Variable PORT no configurada**: El servicio debe usar la variable `PORT` que DO proporciona
3. **Host incorrecto**: Debe escuchar en `0.0.0.0`, no en `localhost`

## Solución

### 1. Configurar Variables de Entorno en DO App Platform

En el panel de DigitalOcean App Platform:

1. Ve a tu app → **Settings** → **App-Level Environment Variables**
2. Agrega estas variables:

```
PORT=8080
VITE_API_URL=http://164.92.116.107:8082
NODE_ENV=production
```

**Importante**: 
- `PORT` debe ser el puerto que DO asigna (generalmente 8080)
- Si DO usa otro puerto, ajusta `PORT` a ese valor
- `VITE_API_URL` debe apuntar a tu backend

### 2. Verificar Configuración del Servicio

En DO App Platform → **Settings** → **App Spec**:

```yaml
services:
  - name: frontend
    http_port: 8080  # Debe coincidir con la variable PORT
    run_command: npm start
    build_command: npm install && npm run build
    envs:
      - key: PORT
        value: "8080"
      - key: VITE_API_URL
        value: "http://164.92.116.107:8082"
```

### 3. Verificar que el Código Use PORT

El `vite.config.js` ya está configurado para usar `process.env.PORT`:

```javascript
port: process.env.PORT ? parseInt(process.env.PORT) : 3000
```

Y `host: '0.0.0.0'` está configurado correctamente.

### 4. Verificar Logs

En DO App Platform → **Runtime Logs**, deberías ver:

```
VITE v7.2.6  ready in XXX ms
➜  Local:   http://localhost:8080/
➜  Network: http://0.0.0.0:8080/
```

Si ves `localhost:80`, significa que la variable `PORT` no está configurada correctamente.

## Troubleshooting

### El frontend no responde

1. **Verificar variable PORT**:
   - En DO App Platform → **Runtime Logs**
   - Busca el mensaje de inicio de Vite
   - Debe mostrar el puerto correcto (no 80)

2. **Verificar health check**:
   - DO App Platform hace health checks en el puerto configurado
   - Asegúrate de que `http_port` coincida con `PORT`

3. **Verificar firewall/rutas**:
   - DO App Platform maneja esto automáticamente
   - Pero verifica que el servicio esté "Healthy" en el dashboard

### El frontend carga pero no se conecta al backend

1. **Verificar VITE_API_URL**:
   - Debe ser `http://164.92.116.107:8082` (sin `/api` al final)
   - Vite agregará `/api` automáticamente en el proxy

2. **Verificar CORS en el backend**:
   - El backend debe permitir requests desde el dominio de DO
   - Verifica `traccar-production.xml` o configuración de CORS

3. **Verificar que el backend esté accesible**:
   ```bash
   curl http://164.92.116.107:8082/api/server
   ```

## Configuración Recomendada

### Variables de Entorno Mínimas:

```
PORT=8080
VITE_API_URL=http://164.92.116.107:8082
NODE_ENV=production
```

### App Spec Mínimo:

```yaml
name: conectytrack-frontend
services:
  - name: frontend
    source_dir: /
    github:
      repo: tu-usuario/tu-repo
      branch: main
    build_command: npm install && npm run build
    run_command: npm start
    http_port: 8080
    envs:
      - key: PORT
        value: "8080"
      - key: VITE_API_URL
        value: "http://164.92.116.107:8082"
```

## Configuración de Dominio

### Dominio Configurado

- **Dominio**: `https://ctrack.conecty.io/`

### Pasos para Configurar el Dominio en DO App Platform

1. **En DO App Platform → Settings → Domains**:
   - Agrega el dominio: `ctrack.conecty.io`
   - DO configurará automáticamente el certificado SSL

2. **Configurar DNS**:
   - Crea un registro CNAME en tu proveedor DNS:
     ```
     ctrack.conecty.io → tu-app.ondigitalocean.app
     ```
   - O un registro A apuntando a la IP de DO

3. **Verificar CORS en el Backend**:
   - El backend ya está configurado con `web.origin` en `traccar-production.xml`
   - Valor: `https://ctrack.conecty.io`

### Variables de Entorno Actualizadas

Si el frontend está en `https://ctrack.conecty.io/`, asegúrate de que:

```
PORT=8080
VITE_API_URL=http://164.92.116.107:8082
NODE_ENV=production
```

**Nota**: El `VITE_API_URL` sigue apuntando al backend en `http://164.92.116.107:8082` porque el frontend hace proxy de las requests al backend.

## Próximos Pasos

1. ✅ Verificar que `PORT` esté configurado en DO
2. ✅ Verificar que `http_port` coincida con `PORT`
3. ✅ Verificar logs para confirmar el puerto correcto
4. ✅ Probar acceso desde navegador
5. ✅ Configurar dominio personalizado: `https://ctrack.conecty.io/`
6. ✅ Configurar HTTPS/SSL (automático en DO App Platform)
7. ✅ Configurar CORS en backend para permitir el dominio

