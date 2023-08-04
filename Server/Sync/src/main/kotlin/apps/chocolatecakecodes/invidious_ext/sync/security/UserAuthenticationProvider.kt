package apps.chocolatecakecodes.invidious_ext.sync.security

import apps.chocolatecakecodes.invidious_ext.sync.constants.UserRoles
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import apps.chocolatecakecodes.invidious_ext.util.crypto.PasswordEncoder
import io.micronaut.http.HttpRequest
import io.micronaut.security.authentication.AuthenticationFailureReason
import io.micronaut.security.authentication.AuthenticationProvider
import io.micronaut.security.authentication.AuthenticationRequest
import io.micronaut.security.authentication.AuthenticationResponse
import jakarta.inject.Inject
import jakarta.inject.Singleton
import org.reactivestreams.Publisher
import reactor.core.publisher.Flux
import reactor.core.publisher.FluxSink

@Singleton
class UserAuthenticationProvider(
    @Inject private val userService: UserService,
    @Inject private val passwordEncoder: PasswordEncoder
) : AuthenticationProvider<HttpRequest<*>> {

    @Suppress("ReactiveStreamsThrowInOperator")
    override fun authenticate(
        httpRequest: HttpRequest<*>?,
        authenticationRequest: AuthenticationRequest<*, *>
    ): Publisher<AuthenticationResponse> {
        return Flux.create({ emitter: FluxSink<AuthenticationResponse> ->
            try {
                val username = authenticationRequest.identity as? String ?:
                    throw IllegalArgumentException("username must be a string")
                val user = userService.loadUser(username)

                val password = authenticationRequest.secret as? String ?:
                    throw IllegalArgumentException("password must be a string")
                if(!passwordEncoder.matches(password, user.password)) {
                    throw AuthenticationResponse.exception(AuthenticationFailureReason.CREDENTIALS_DO_NOT_MATCH)
                }

                userService.upgradePasswordIfNecessary(user, password)

                emitter.next(AuthenticationResponse.success(username, listOf(UserRoles.USER)))
                emitter.complete()
            } catch(e: Exception) {
                emitter.error(e)
            }
        }, FluxSink.OverflowStrategy.ERROR)
    }
}
