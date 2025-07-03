from django.contrib import admin
from .models import Review

@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ('id', 'order', 'rating', 'created_at')
    list_filter = ('rating', 'created_at')
    search_fields = ('comment', 'order__id')
    readonly_fields = ('created_at',)

    def get_queryset(self, request):
        # Get the admin user
        admin_user = request.user
        if hasattr(admin_user, 'is_employee') and admin_user.is_employee and admin_user.created_by:
            admin_user = admin_user.created_by
        # Return only reviews for orders belonging to this admin
        return Review.objects.filter(order__user=admin_user)

# Review admin configuration has been removed 