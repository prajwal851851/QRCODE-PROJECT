from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('UserRole', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='permission',
            name='users',
            field=models.ManyToManyField(blank=True, related_name='custom_permissions', to='UserRole.customuser'),
        ),
    ] 