# Esewa Payment Integration Settings
# Production environment settings - admins must configure their own credentials
# Frontend URL - Use localhost for development, production URL for production
import os
if os.environ.get('DEBUG', 'True').lower() == 'true':
    FRONTEND_BASE_URL = 'http://localhost:3003'
else:
FRONTEND_BASE_URL = 'https://qr-menu-code.netlify.app' 