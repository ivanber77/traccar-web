#!/bin/bash

# Script para desarrollo local del frontend
# Conecta el frontend al backend (local o remoto)

set -e

cd "$(dirname "$0")"

# Backend URL - cambiar según necesites
# Por defecto conecta al servidor remoto, pero puedes pasar localhost:8082 para backend local
BACKEND_URL=${1:-"https://tracker.conecty.io"}

echo "🚀 Iniciando frontend en modo desarrollo..."
echo "🔗 Conectado a backend: $BACKEND_URL"
echo ""

# Verificar que existe package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    echo "   Asegúrate de estar en el directorio del frontend"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Configurar variable de entorno para el backend
export VITE_API_URL="$BACKEND_URL"
export API_URL="$BACKEND_URL"

# Configurar puerto (por defecto 3000, o usar PORT si está definido)
# Para usar puerto 80: PORT=80 ./dev.sh
PORT=${PORT:-3000}
export PORT

echo "✅ Frontend iniciado"
echo "🔌 Puerto: $PORT"
echo "🌐 Abre tu navegador en la URL que se muestre arriba"
echo ""
echo "Presiona Ctrl+C para detener"
echo ""

# Iniciar servidor de desarrollo
# Intentar diferentes comandos según el framework
if grep -q "react-scripts" package.json 2>/dev/null; then
    PORT=$PORT npm start
elif grep -q "vite" package.json 2>/dev/null; then
    # Verificar si necesitamos sudo para el puerto 80
    if [ "$PORT" = "80" ] && [ "$(id -u)" -ne 0 ]; then
        echo "⚠️  Puerto 80 requiere permisos de administrador"
        echo "   Ejecuta: sudo PORT=80 ./dev.sh"
        echo "   O usa otro puerto: PORT=3000 ./dev.sh"
        exit 1
    fi
    PORT=$PORT npm run dev
elif grep -q "webpack" package.json 2>/dev/null; then
    npm run serve || npm start
else
    echo "⚠️  Framework no detectado, intentando 'npm start'..."
    npm start
fi

