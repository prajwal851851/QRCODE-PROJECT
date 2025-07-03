from django.urls import path
from .views import LoginView, UserListCreateView, UserRetrieveUpdateDestroyView, PermissionListView, CurrentUserView, RoleDescriptionView, MyUsersView

app_name = 'UserRole'

urlpatterns = [
    path('login/', LoginView.as_view(), name='login'),
    path('users/me/', CurrentUserView.as_view(), name='current-user'),
    path('users/', UserListCreateView.as_view(), name='user-list-create'),
    path('users/my-users/', MyUsersView.as_view(), name='my-users'),
    path('users/<int:pk>/', UserRetrieveUpdateDestroyView.as_view(), name='user-retrieve-update-destroy'),
    path('permissions/', PermissionListView.as_view(), name='permission-list'),
    path('roles/descriptions/', RoleDescriptionView.as_view(), name='role-descriptions'),
]
