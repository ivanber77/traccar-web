# Configuración de Puerto - Frontend

## Desarrollo Local

### Puerto 3000 (Recomendado - No requiere permisos)
```bash
cd frontend
./dev.sh
```
El frontend estará disponible en: `http://localhost:3000`

### Puerto 80 (Requiere permisos de administrador)
```bash
cd frontend
sudo PORT=80 ./dev.sh
```
El frontend estará disponible en: `http://localhost:80`

**Nota**: En macOS/Linux, el puerto 80 requiere permisos de root.

## Producción

### Opción 1: Servido por el Backend de Traccar
El frontend se compila y se copia a `/opt/traccar/web/` en el servidor.
El backend de Traccar sirve el frontend en el puerto configurado (por defecto 8082).

**URL de acceso**: `http://164.92.116.107:8082`

### Opción 2: Servidor Web Independiente (Nginx/Apache)
Si el frontend corre como servicio independiente:

1. **Configurar variable de entorno PORT**:
   ```bash
   export PORT=80
   npm start
   ```

2. **O en el archivo de configuración del servicio** (systemd/docker):
   ```ini
   Environment="PORT=80"
   ```

3. **O en el archivo de despliegue** (DigitalOcean App Platform, etc.):
   - Configurar variable de entorno `PORT=80` en el panel de control

## Verificación

Para verificar en qué puerto está corriendo:
```bash
# Ver procesos en puertos 80 y 3000
lsof -i :80
lsof -i :3000

# O verificar desde el navegador
# http://localhost:80
# http://localhost:3000
```

## Troubleshooting

### Error: "Port 80 is already in use"
```bash
# Ver qué proceso está usando el puerto 80
sudo lsof -i :80

# Detener el proceso o usar otro puerto
PORT=3000 ./dev.sh
```

### Error: "Permission denied" al usar puerto 80
```bash
# Usar sudo (solo en desarrollo)
sudo PORT=80 ./dev.sh

# O usar puerto 3000 (recomendado)
PORT=3000 ./dev.sh
```

### El frontend no responde en producción
1. Verificar que el servicio esté corriendo:
   ```bash
   systemctl status frontend
   # O
   ps aux | grep vite
   ```

2. Verificar que el puerto esté abierto:
   ```bash
   sudo ufw status
   sudo ufw allow 80/tcp
   ```

3. Verificar logs:
   ```bash
   journalctl -u frontend -f
   # O
   tail -f /var/log/frontend.log
   ```

