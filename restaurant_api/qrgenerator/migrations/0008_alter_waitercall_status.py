# Generated by Django 5.2 on 2025-06-15 10:58

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('qrgenerator', '0007_alter_waitercall_status'),
    ]

    operations = [
        migrations.AlterField(
            model_name='waitercall',
            name='status',
            field=models.CharField(default='active', max_length=20),
        ),
    ]
