FROM nginx:alpine

# Copiar configuración de Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar archivos estáticos
COPY . /usr/share/nginx/html

# Eliminar archivos de configuración del directorio HTML
RUN rm -f /usr/share/nginx/html/nginx.conf \
    && rm -f /usr/share/nginx/html/Dockerfile

# Exponer puerto
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
