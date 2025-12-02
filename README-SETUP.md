# Setup Frontend - Solución de Problemas

## Problema: Versión de Node.js

El frontend requiere Node.js 20.19+ o 22.12+, pero tienes 20.11.0.

## Soluciones

### Opción 1: Actualizar Node.js con Homebrew (Recomendado)

```bash
# Instalar Node.js 22 (LTS)
brew install node@22

# O actualizar Node.js existente
brew upgrade node
```

Luego verificar:
```bash
node -v  # Debe ser 20.19+ o 22.12+
```

### Opción 2: Usar nvm (Node Version Manager)

```bash
# Instalar nvm si no lo tienes
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reiniciar terminal o ejecutar:
source ~/.zshrc

# Instalar Node.js 22
nvm install 22
nvm use 22
```

### Opción 3: Usar el Backend Remoto sin Frontend Local

Puedes acceder directamente al backend remoto:
- **URL**: http://164.92.116.107:8082
- El backend ya tiene el frontend compilado (cuando lo despliegues)

## Una vez actualizado Node.js

```bash
cd frontend

# Instalar dependencias (si no lo hiciste)
npm install

# Iniciar desarrollo
VITE_API_URL=http://164.92.116.107:8082 npm start
```

El frontend estará disponible en: http://localhost:3000


