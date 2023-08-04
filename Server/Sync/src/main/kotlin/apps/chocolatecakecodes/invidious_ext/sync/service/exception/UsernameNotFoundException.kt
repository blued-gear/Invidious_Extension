package apps.chocolatecakecodes.invidious_ext.sync.service.exception

import io.micronaut.security.authentication.AuthenticationException
import io.micronaut.security.authentication.AuthenticationFailureReason
import io.micronaut.security.authentication.AuthenticationResponse

class UsernameNotFoundException : AuthenticationException(
    AuthenticationResponse.failure(AuthenticationFailureReason.USER_NOT_FOUND)
)
