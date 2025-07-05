"""
WSGI config for restaurant_api project.

It exposes the WSGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/wsgi/
"""

import os
import sys
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_api.settings')

# Run startup commands only once when the application starts
def run_startup_commands():
    """Run management commands on startup"""
    try:
        from django.core.management import execute_from_command_line
        from django.conf import settings
        
        # Only run if we're in production and not during migrations
        if not settings.DEBUG and 'migrate' not in sys.argv and 'collectstatic' not in sys.argv:
            print("Running startup commands...")
            
            # Create permissions
            execute_from_command_line(['manage.py', 'create_permissions'])
            
            # Assign role permissions
            execute_from_command_line(['manage.py', 'assign_role_permissions'])
            
            print("Startup commands completed!")
    except Exception as e:
        print(f"Startup commands error (non-critical): {e}")

# Run startup commands
run_startup_commands()

application = get_wsgi_application()
