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
        
        print("Running startup commands...")
        
        # Create permissions
        print("Creating permissions...")
        execute_from_command_line(['manage.py', 'create_permissions'])
        
        # Assign role permissions
        print("Assigning role permissions...")
        execute_from_command_line(['manage.py', 'assign_role_permissions'])
        
        print("Startup commands completed successfully!")
        
    except Exception as e:
        print(f"Error running startup commands: {e}")
        # Don't fail the startup, just log the error

if __name__ == '__main__':
    run_startup_commands() 