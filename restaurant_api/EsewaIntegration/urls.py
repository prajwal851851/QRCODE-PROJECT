from django.urls import path
from .views import initiate_payment, verify_payment, check_transaction_status, cancel_payment, link_transaction_to_order, recreate_order_from_transaction

urlpatterns = [
    path('initiate/', initiate_payment, name='esewa-initiate'),
    path('verify/', verify_payment, name='esewa-verify'),
    path('status/', check_transaction_status, name='esewa-status'),
    path('cancel/', cancel_payment, name='esewa-cancel'),
    path('link/', link_transaction_to_order, name='esewa-link'),
    path('recreate-order/', recreate_order_from_transaction, name='esewa-recreate-order'),
]
