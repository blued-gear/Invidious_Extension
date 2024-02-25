package apps.chocolatecakecodes.invidious_ext.sync.security

import apps.chocolatecakecodes.invidious_ext.sync.constants.UserRoles
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import apps.chocolatecakecodes.invidious_ext.util.crypto.PasswordEncoder
import io.micronaut.http.HttpRequest
import io.micronaut.security.authentication.AuthenticationFailureReason
import io.micronaut.security.authentication.AuthenticationRequest
import io.micronaut.security.authentication.AuthenticationResponse
import io.micronaut.security.authentication.provider.HttpRequestAuthenticationProvider
import jakarta.inject.Inject
import jakarta.inject.Singleton

@Singleton
class UserAuthenticationProvider(
    @Inject private val userService: UserService,
    @Inject private val passwordEncoder: PasswordEncoder
) : HttpRequestAuthenticationProvider<Any?> {

    override fun authenticate(
        httpRequest: HttpRequest<Any?>?,
        authenticationRequest: AuthenticationRequest<String, String>
    ): AuthenticationResponse {
        val username = authenticationRequest.identity
        val user = userService.loadUser(username)

        val password = authenticationRequest.secret
        if(!passwordEncoder.matches(password, user.password)) {
            throw AuthenticationResponse.exception(AuthenticationFailureReason.CREDENTIALS_DO_NOT_MATCH)
        }

        userService.upgradePasswordIfNecessary(user, password)

        return AuthenticationResponse.success(username, listOf(UserRoles.USER))
    }
}
