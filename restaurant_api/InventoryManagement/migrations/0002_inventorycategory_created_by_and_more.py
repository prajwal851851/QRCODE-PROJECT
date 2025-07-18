# Generated by Django 5.2 on 2025-06-30 10:54

import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('InventoryManagement', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='inventorycategory',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inventory_categories', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='inventoryitem',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='inventory_items', to=settings.AUTH_USER_MODEL),
        ),
        migrations.AddField(
            model_name='supplier',
            name='created_by',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='suppliers', to=settings.AUTH_USER_MODEL),
        ),
    ]
