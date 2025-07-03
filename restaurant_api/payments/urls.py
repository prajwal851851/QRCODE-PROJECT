from django.urls import path
from . import views

urlpatterns = [
    path('', views.list_payments, name='list_payments'),
    path('<str:payment_id>/toggle-status/', views.toggle_payment_status, name='toggle_payment_status'),
    path('<str:payment_id>/delete/', views.delete_payment, name='delete_payment'),
    path('delete-all/', views.delete_all_payments, name='delete_all_payments'),
] 