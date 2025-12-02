#!/bin/bash

# Script para compilar el frontend para producción

set -e

cd "$(dirname "$0")"

echo "🔨 Compilando frontend para producción..."

# Verificar que existe package.json
if [ ! -f "package.json" ]; then
    echo "❌ Error: No se encontró package.json"
    exit 1
fi

# Instalar dependencias si no existen
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

# Compilar
echo "📦 Compilando..."
if grep -q "react-scripts" package.json 2>/dev/null; then
    npm run build
elif grep -q "vite" package.json 2>/dev/null; then
    npm run build
else
    npm run build || npm run dist
fi

# Verificar que se creó el build
if [ ! -d "build" ] && [ ! -d "dist" ]; then
    echo "❌ Error: No se generó el build"
    exit 1
fi

BUILD_DIR="build"
[ -d "dist" ] && BUILD_DIR="dist"

echo "✅ Compilación exitosa!"
echo "📦 Archivos generados en: $BUILD_DIR/"
echo ""
echo "📋 Para desplegar, copia los archivos de $BUILD_DIR/ a /opt/traccar/web/ en el servidor"


