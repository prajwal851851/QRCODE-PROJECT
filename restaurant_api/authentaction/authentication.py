from rest_framework_simplejwt.authentication import JWTAuthentication
from django.conf import settings
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework.authentication import get_authorization_header
from django.utils.translation import gettext_lazy as _

class CookieJWTAuthentication(JWTAuthentication):
    def authenticate(self, request):
        # First try to get token from cookie
        cookie_name = getattr(settings, 'SIMPLE_JWT', {}).get('AUTH_COOKIE', 'access_token')
        raw_token = request.COOKIES.get(cookie_name)
        
        if raw_token is None:
            # If no cookie, try to get from Authorization header
            header = get_authorization_header(request).split()
            if len(header) == 2:
                raw_token = header[1]
            else:
                return None

        if raw_token is None:
            return None

        try:
            validated_token = self.get_validated_token(raw_token)
            return self.get_user(validated_token), validated_token
        except TokenError as e:
            raise InvalidToken(e.args[0])

    def authenticate_header(self, request):
        return 'Bearer realm="api"' 