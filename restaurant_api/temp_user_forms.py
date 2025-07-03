from django import forms
from django.contrib.auth.admin import UserAdmin
from django.contrib.auth.forms import UserCreationForm, UserChangeForm
from django.utils.translation import gettext_lazy as _
from UserRole.models import CustomUser, Permission

class CustomUserCreationForm(UserCreationForm):
    # Add custom fields for permissions by category
    menu_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Menu-related permissions'
    )
    
    order_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['orders_view', 'orders_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Order-related permissions'
    )
    
    customer_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['customers_view', 'customers_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Customer-related permissions'
    )
    
    qr_code_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['qr_code_view', 'qr_code_manage', 'qr_generate']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='QR code management permissions'
    )
    
    account_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Account management permissions'
    )
    
    user_management_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['users_view', 'users_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='User management permissions'
    )
    
    other_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.exclude(
            id__in=['menu_view', 'menu_edit', 'orders_view', 'orders_manage', 
                   'customers_view', 'customers_manage', 'users_view', 'users_manage',
                   'qr_code_view', 'qr_code_manage', 'qr_generate',
                   'account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Other system permissions'
    )
    
    class Meta(UserCreationForm.Meta):
        model = CustomUser
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'status', 'is_employee')

class CustomUserForm(UserChangeForm):
    # Add custom fields for permissions by category
    menu_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['menu_view', 'menu_edit']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Menu-related permissions'
    )
    
    order_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['orders_view', 'orders_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Order-related permissions'
    )
    
    customer_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['customers_view', 'customers_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Customer-related permissions'
    )
    
    qr_code_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['qr_code_view', 'qr_code_manage', 'qr_generate']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='QR code management permissions'
    )
    
    account_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Account management permissions'
    )
    
    user_management_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.filter(id__in=['users_view', 'users_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='User management permissions'
    )
    
    other_permissions = forms.ModelMultipleChoiceField(
        queryset=Permission.objects.exclude(
            id__in=['menu_view', 'menu_edit', 'orders_view', 'orders_manage', 
                   'customers_view', 'customers_manage', 'users_view', 'users_manage',
                   'qr_code_view', 'qr_code_manage', 'qr_generate',
                   'account_view', 'account_manage']),
        required=False,
        widget=forms.CheckboxSelectMultiple,
        help_text='Other system permissions'
    )
    
    class Meta(UserChangeForm.Meta):
        model = CustomUser
        fields = ('username', 'email', 'first_name', 'last_name', 'role', 'status', 'is_employee')
