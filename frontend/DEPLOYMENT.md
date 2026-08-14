# Docks2Doc Deployment Guide

## Subdirectory Deployment (/docks2doc)

This project is configured to run under the subdirectory `/docks2doc` on your domain (e.g., `winggs.com/docks2doc`).

### Configuration

The Next.js configuration has been updated with:
- `basePath: '/docks2doc'` - All routes will be prefixed with `/docks2doc`
- `assetPrefix: '/docks2doc'` - Static assets will be served from `/docks2doc`
- `output: 'standalone'` - Optimized for production deployment

### Deployment Steps

#### 1. Build the Project
```bash
npm run build
```

#### 2. Start the Production Server
```bash
npm run start
```
The server will start on port 7003 (as configured in package.json).

#### 3. Configure Web Server

**Nginx Configuration:**
Add the following to your nginx server block (see `nginx.conf`):
```nginx
location /docks2doc {
    proxy_pass http://localhost:7003;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}
```

**Apache Configuration:**
Add the following to your Apache virtual host (see `apache.conf`):
```apache
ProxyPass /docks2doc http://localhost:7003/docks2doc
ProxyPassReverse /docks2doc http://localhost:7003/docks2doc
ProxyPreserveHost On
```

#### 4. Restart Web Server
```bash
# Nginx
sudo systemctl restart nginx

# Apache
sudo systemctl restart apache2
```

### Access the Application

After deployment, access the application at:
- Main URL: `https://winggs.com/docks2doc`
- Login: `https://winggs.com/docks2doc/login`
- Register: `https://winggs.com/docks2doc/register`

### Important Notes

1. **All internal links** will automatically include the `/docks2doc` prefix due to the basePath configuration
2. **API calls** should use relative paths or include the full path with `/docks2doc`
3. **Static assets** (images, fonts, etc.) will be served from `/docks2doc/_next/static/`
4. **Environment variables** should be set before building if needed

### Troubleshooting

**404 Errors:**
- Ensure nginx/apache is configured to proxy requests correctly
- Check that the Next.js server is running on port 7003
- Verify the basePath configuration in next.config.ts

**Static Asset Issues:**
- Clear browser cache
- Check that assetPrefix is set correctly in next.config.ts
- Verify file permissions on .next/static directory

**API/Route Issues:**
- Ensure all API routes use the correct base path
- Check that proxy headers are correctly forwarded
- Verify CORS settings if making cross-origin requests

### Production Considerations

For production deployment, consider:
1. Using a process manager like PM2 to keep the server running
2. Setting up SSL/HTTPS certificates
3. Configuring proper logging and monitoring
4. Setting up automatic backups
5. Using a reverse proxy cache for static assets
