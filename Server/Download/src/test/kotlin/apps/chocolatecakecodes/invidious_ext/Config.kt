package apps.chocolatecakecodes.invidious_ext

import io.micronaut.context.annotation.Factory
import io.micronaut.http.filter.HttpClientFilter
import io.micronaut.security.authentication.AuthenticationResponse
import io.micronaut.security.authentication.provider.HttpRequestAuthenticationProvider
import jakarta.inject.Singleton

@Factory
internal class Config {

    // DownloadController requires auth, so mock it

    @Singleton
    fun securityAllowAllChain() = HttpClientFilter { request, chain ->
        request.basicAuth("dummy", "dummy")
        chain.proceed(request)
    }

    @Singleton
    fun securityAllowAllAuth() = HttpRequestAuthenticationProvider<Any> { _, _ ->
        AuthenticationResponse.success("dummy")
    }
}
