#!/bin/bash

# Script para desarrollo local del frontend
# Conecta el frontend al backend (local o remoto)

set -e

cd "$(dirname "$0")"

# Backend URL - cambiar según necesites
# Por defecto conecta al servidor remoto, pero puedes pasar localhost:8082 para backend local
BACKEND_URL=${1:-"http://164.92.116.107:8082"}

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

echo "✅ Frontend iniciado"
echo "🌐 Abre tu navegador en la URL que se muestre arriba"
echo ""
echo "Presiona Ctrl+C para detener"
echo ""

# Iniciar servidor de desarrollo
# Intentar diferentes comandos según el framework
if grep -q "react-scripts" package.json 2>/dev/null; then
    npm start
elif grep -q "vite" package.json 2>/dev/null; then
    npm run dev
elif grep -q "webpack" package.json 2>/dev/null; then
    npm run serve || npm start
else
    echo "⚠️  Framework no detectado, intentando 'npm start'..."
    npm start
fi

