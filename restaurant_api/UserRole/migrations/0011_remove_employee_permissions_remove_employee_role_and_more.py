# Generated by Django 5.2 on 2025-05-26 04:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('UserRole', '0010_customuser_permissions_customuser_role'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='employee',
            name='permissions',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='role',
        ),
        migrations.RemoveField(
            model_name='employee',
            name='user',
        ),
        migrations.RemoveField(
            model_name='customuser',
            name='name',
        ),
        migrations.RemoveField(
            model_name='customuser',
            name='permissions',
        ),
        migrations.AlterField(
            model_name='customuser',
            name='role',
            field=models.CharField(choices=[('admin', 'Admin'), ('employee', 'Employee')], default='employee', max_length=20),
        ),
        migrations.DeleteModel(
            name='Permission',
        ),
        migrations.DeleteModel(
            name='Role',
        ),
        migrations.DeleteModel(
            name='Employee',
        ),
    ]
