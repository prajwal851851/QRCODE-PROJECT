from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Table
import qrcode
import os
from io import BytesIO
from django.conf import settings

@receiver(post_save, sender=Table)
def generate_qr_code_image(sender, instance, created, **kwargs):
    # Generate the QR code URL dynamically
            qr_data = f"https://dynamic-creponne-83f334.netlify.app/menu?tableId={instance.name}"
    qr = qrcode.make(qr_data)
    buffer = BytesIO()
    qr.save(buffer, format='PNG')

    filename = f"qr_codes/table_{instance.name}.png"
    filepath = os.path.join(settings.MEDIA_ROOT, filename)
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    with open(filepath, 'wb') as f:
        f.write(buffer.getvalue())
