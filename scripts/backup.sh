#!/bin/bash
# Script para backup automático

set -e

BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_FILE="database/taller.db"

# Crear directorio de backups si no existe
mkdir -p $BACKUP_DIR

echo "🔄 Creando backup de la base de datos..."

if [ -f "$DB_FILE" ]; then
    # Backup de la base de datos
    cp "$DB_FILE" "$BACKUP_DIR/taller_backup_$DATE.db"
    
    # Comprimir el backup
    gzip "$BACKUP_DIR/taller_backup_$DATE.db"
    
    echo "✅ Backup creado: $BACKUP_DIR/taller_backup_$DATE.db.gz"
    
    # Limpiar backups antiguos (mantener solo los últimos 10)
    cd $BACKUP_DIR
    ls -t taller_backup_*.db.gz | tail -n +11 | xargs -r rm
    echo "🧹 Limpieza de backups antiguos completada"
    
else
    echo "❌ No se encontró la base de datos en $DB_FILE"
    exit 1
fi

echo "📊 Backups disponibles:"
ls -lah $BACKUP_DIR/