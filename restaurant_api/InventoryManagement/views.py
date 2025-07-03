from django.shortcuts import render
from rest_framework import viewsets, filters, permissions, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from .models import (
    InventoryCategory, Supplier, InventoryItem, StockIn, StockOut, IngredientMapping, InventoryAlert
)
from .serializers import (
    InventoryCategorySerializer, SupplierSerializer, InventoryItemSerializer, StockInSerializer,
    StockOutSerializer, IngredientMappingSerializer, InventoryAlertSerializer
)

# Create your views here.

class InventoryCategoryViewSet(viewsets.ModelViewSet):
    queryset = InventoryCategory.objects.all()
    serializer_class = InventoryCategorySerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name']

    def get_queryset(self):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        return InventoryCategory.objects.filter(created_by=admin)

    def perform_create(self, serializer):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        serializer.save(created_by=admin)

class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'contact_person', 'email', 'phone']

    def get_queryset(self):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        return Supplier.objects.filter(created_by=admin)

    def perform_create(self, serializer):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        serializer.save(created_by=admin)

class InventoryItemViewSet(viewsets.ModelViewSet):
    queryset = InventoryItem.objects.all()
    serializer_class = InventoryItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'code']
    ordering_fields = ['name', 'current_stock', 'minimum_threshold', 'purchase_price']

    def get_queryset(self):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        return InventoryItem.objects.filter(created_by=admin)

    def perform_create(self, serializer):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        serializer.save(created_by=admin)

class StockInViewSet(viewsets.ModelViewSet):
    queryset = StockIn.objects.all()
    serializer_class = StockInSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['item__name', 'supplier__name', 'invoice_id']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        return StockIn.objects.filter(item__created_by=admin)

    def perform_create(self, serializer):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        serializer.save(created_by=admin)

class StockOutViewSet(viewsets.ModelViewSet):
    queryset = StockOut.objects.all()
    serializer_class = StockOutSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['item__name', 'reason', 'dish__name']
    ordering_fields = ['date', 'created_at']

    def get_queryset(self):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        return StockOut.objects.filter(item__created_by=admin)

    def perform_create(self, serializer):
        user = self.request.user
        admin = user.created_by if getattr(user, 'is_employee', False) and user.created_by else user
        serializer.save(created_by=admin)

    def create(self, request, *args, **kwargs):
        try:
            return super().create(request, *args, **kwargs)
        except ValueError as e:
            return Response({'detail': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class IngredientMappingViewSet(viewsets.ModelViewSet):
    queryset = IngredientMapping.objects.all()
    serializer_class = IngredientMappingSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['dish__name', 'ingredient__name']

class InventoryAlertViewSet(viewsets.ModelViewSet):
    queryset = InventoryAlert.objects.all()
    serializer_class = InventoryAlertSerializer
    permission_classes = [AllowAny]
    filter_backends = [filters.SearchFilter]
    search_fields = ['item__name', 'alert_type', 'message']
