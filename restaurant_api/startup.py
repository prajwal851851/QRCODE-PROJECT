#!/usr/bin/env python
"""
Startup script to run management commands when the application starts.
This ensures permissions are created and assigned even if the build script fails.
"""

import os
import django
import sys

def run_startup_commands():
    """Run necessary startup commands"""
    try:
        # Setup Django
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'restaurant_api.settings')
        django.setup()
        
        from django.core.management import execute_from_command_line
        from django.db import connection
        from django.core.exceptions import ImproperlyConfigured
        
        print("Running startup commands...")
        
        # Check if database is accessible
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
            print("Database connection successful")
        except Exception as db_error:
            print(f"Database not accessible: {db_error}")
            print("Skipping permission setup - will be handled by migrations")
            return
        
        # Only run these commands if database is accessible
        try:
            # Create admin user (only if doesn't exist or needs reset)
            print("Ensuring admin user exists...")
            try:
                exec(open('create_admin.py').read())
                print("Admin user setup completed")
            except FileNotFoundError:
                print("create_admin.py not found, skipping admin setup")
            except Exception as admin_error:
                print(f"Admin setup error (non-critical): {admin_error}")
            
            # Create permissions
            print("Creating permissions...")
            execute_from_command_line(['manage.py', 'create_permissions'])
            
            # Assign role permissions
            print("Assigning role permissions...")
            execute_from_command_line(['manage.py', 'assign_role_permissions'])
            
            print("Startup commands completed successfully!")
        except Exception as cmd_error:
            print(f"Error running management commands: {cmd_error}")
            print("This is normal if database tables don't exist yet")
        
    except Exception as e:
        print(f"Error running startup commands: {e}")
        # Don't fail the startup, just log the error

if __name__ == '__main__':
    run_startup_commands() 