"""
Django settings for restaurant_api project.

Generated by 'django-admin startproject' using Django 5.2.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

from pathlib import Path
import os
#import django_heroku 
from datetime import timedelta

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# Quick-start development settings - unsuitable for production
# See https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# SECURITY WARNING: keep the secret key used in production se

SECRET_KEY = os.getenv("SECRET_KEY")


# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.environ.get('DEBUG', 'False').strip().lower() == 'true'


ALLOWED_HOSTS = [host.strip() for host in os.environ.get('ALLOWED_HOSTS', '').split(',') if host.strip()]




# Application definition

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'django_filters',
    'our_menu',
    'corsheaders',
    'djoser',
    'qrgenerator',
    'authentaction',
    'rest_framework_simplejwt.token_blacklist',
    'UserRole',
    'PaynmentANDreview',
    'EsewaIntegration',
    'InventoryManagement',
    'esewaSecretKey',
    'Billing',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # CORS should be first
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Custom middleware to redirect employees to their permitted sections
    'UserRole.middleware.EmployeeRedirectMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
]

ROOT_URLCONF = 'restaurant_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.template.context_processors.debug',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'restaurant_api.wsgi.application'


# Database
# https://docs.djangoproject.com/en/5.2/ref/settings/#databases


# PostgreSQL configuration (for production)

import dj_database_url
DATABASES = {
    'default': dj_database_url.config(default=os.environ.get("DATABASE_URL"))
}



# Password validation
# https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalization
# https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
# https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Custom user model

AUTH_USER_MODEL = 'UserRole.CustomUser'

# URL Configuration
APPEND_SLASH = False


REST_FRAMEWORK = {
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated'

    ],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework.authentication.SessionAuthentication',
        'rest_framework.authentication.BasicAuthentication',
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'authentaction.authentication.CookieJWTAuthentication',   # your custom class path
    ],
}


# CORS settings
if DEBUG:
    CORS_ALLOW_ALL_ORIGINS = True
else:
    CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')
    CORS_ALLOW_CREDENTIALS = True

ROOT_URLCONF = 'restaurant_api.urls'


MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'


DJOSER = {
    "LOGIN_FIELD": "email",
    "USER_CREATE_PASSWORD_RETYPE": True,
    "SERIALIZERS": {},
}


# CSRF settings
CSRF_TRUSTED_ORIGINS = [
    'https://qr-menu-code.netlify.app',
    'http://localhost:3000',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3003',
]

CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_HTTPONLY = False  # Set to False to allow JavaScript to read the cookie
CSRF_USE_SESSIONS = False
CSRF_COOKIE_SECURE = False  # Set to True in production with HTTPS
CSRF_COOKIE_NAME = 'csrftoken'
CSRF_HEADER_NAME = 'HTTP_X_CSRFTOKEN'

# Session settings
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE = False  # Set to True in production with HTTPS
SESSION_COOKIE_AGE = 3600  # 1 hour
SESSION_EXPIRE_AT_BROWSER_CLOSE = False
SESSION_SAVE_EVERY_REQUEST = True
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

CORS_ALLOWED_ORIGINS = [
    'https://qr-menu-code.netlify.app',
    'http://localhost:3000',
    'http://localhost:3003',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3003',
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    "AUTH_COOKIE": "access_token",
    "AUTH_COOKIE_SECURE": False,
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": "Lax",
    'AUTH_COOKIE_PATH': '/',
}

# Gmail SMTP email backend for production
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = 'smtp.gmail.com'
EMAIL_PORT = 587
EMAIL_USE_TLS = True
EMAIL_HOST_USER = 'qrmenu851@gmail.com'  # <-- Replace with your Gmail address
EMAIL_HOST_PASSWORD = 'afgo tamy ruel szje'   # <-- Use an App Password if 2FA is enabled
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# If you use 2-Step Verification (2FA) on your Google account, you MUST use an App Password:
# https://support.google.com/accounts/answer/185833?hl=en


# Partial settings.py
AUTHENTICATION_BACKENDS = [
    'UserRole.authentication.EmailBackend',
    'django.contrib.auth.backends.ModelBackend',
]

# eSewa Configuration - REMOVED: Each admin now manages their own credentials through the admin panel
# ESEWA_PAYMENT_URL = "https://rc-epay.esewa.com.np/api/epay/main/v2/form"  # Legacy - removed
# ESEWA_PRODUCT_CODE = "EPAYTEST"  # Legacy - removed  
# ESEWA_SECRET_KEY = "8gBm/:&EnhH.1/q("  # Legacy - removed
# Frontend URL - Use localhost for development, production URL for production
if DEBUG:
    FRONTEND_BASE_URL = "http://localhost:3003"
else:
   FRONTEND_BASE_URL = "https://qr-menu-code.netlify.app"

# eSewa Encryption Key - Will auto-generate if not set (recommended for production)
# ESEWA_ENCRYPTION_KEY = "XRUD8vcvWWPP7x95sRaLTSiiMIesLlJ8tF-gpM02Ewg="  # Removed for production
