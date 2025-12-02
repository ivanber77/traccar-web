# Verificación de Despliegue - Frontend

## Estado Actual ✅

El frontend está corriendo correctamente:
- **Puerto**: 80
- **Local**: http://localhost:80/
- **Network**: http://100.127.29.53:80/

## Verificación

### 1. Verificar que el servicio responde

```bash
# Desde el servidor
curl http://localhost:80

# O desde tu máquina local
curl http://100.127.29.53:80
```

### 2. Verificar que el puerto esté abierto

```bash
# En el servidor
sudo ufw status
sudo netstat -tulpn | grep :80

# O verificar con nmap desde tu máquina
nmap -p 80 TU_IP_PUBLICA
```

### 3. Verificar logs del servicio

```bash
# Si usas systemd
journalctl -u frontend -f

# O si es un proceso directo
ps aux | grep vite
```

## Acceso desde Internet

### Si tienes IP pública:
```
http://TU_IP_PUBLICA:80
```

### Si usas dominio:
```
http://tu-dominio.com
```

### Si usas un servicio de cloud (DigitalOcean, AWS, etc.):
1. Verifica las **Security Groups** o **Firewall Rules**
2. Asegúrate de que el puerto 80 esté abierto para tráfico HTTP
3. Si usas HTTPS, configura el puerto 443 también

## Troubleshooting

### El frontend no responde desde fuera

1. **Verificar firewall**:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw reload
   ```

2. **Verificar que el servicio esté escuchando en todas las interfaces**:
   - El `vite.config.js` ya tiene `host: '0.0.0.0'` ✅

3. **Verificar que no haya otro proceso usando el puerto 80**:
   ```bash
   sudo lsof -i :80
   ```

### Error de conexión

Si ves errores de conexión:
- Verifica que el backend esté accesible desde el frontend
- Revisa la configuración de `VITE_API_URL` en el despliegue
- Verifica los logs del frontend para errores de proxy

### El frontend carga pero no se conecta al backend

Verifica que:
1. El backend esté corriendo en `http://164.92.116.107:8082`
2. La variable `VITE_API_URL` esté configurada correctamente
3. El proxy en `vite.config.js` esté apuntando al backend correcto

## Próximos Pasos

1. ✅ Frontend corriendo en puerto 80
2. ⬜ Verificar acceso desde navegador
3. ⬜ Verificar conexión con backend
4. ⬜ Configurar dominio (opcional)
5. ⬜ Configurar HTTPS/SSL (recomendado para producción)

