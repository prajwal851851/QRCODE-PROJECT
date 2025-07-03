from django.urls import path
from . import views

urlpatterns = [
    path('reviews/', views.ReviewListView.as_view(), name='review-list'),
    path('reviews/create/', views.ReviewCreateView.as_view(), name='review-create'),
    path('reviews/<int:pk>/', views.ReviewDetailView.as_view(), name='review-detail'),
    path('reviews/delete-all/', views.ReviewDeleteAllView.as_view(), name='review-delete-all'),
    path('reviews/feedback-overview/', views.FeedbackOverviewView.as_view(), name='feedback-overview'),
    path('popular-items/', views.popular_items, name='popular-items'),
    path('table-performance/', views.table_performance, name='table-performance'),
    path('peak-hours/', views.peak_hours_analysis, name='peak-hours'),
] 