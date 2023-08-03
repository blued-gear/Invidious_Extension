package apps.chocolatecakecodes.invidious_ext.server.config

import apps.chocolatecakecodes.invidious_ext.server.constants.UserRoles
import apps.chocolatecakecodes.invidious_ext.server.service.UserService
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.security.authentication.AuthenticationManager
import org.springframework.security.config.Customizer
import org.springframework.security.config.annotation.authentication.builders.AuthenticationManagerBuilder
import org.springframework.security.config.annotation.web.builders.HttpSecurity
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity
import org.springframework.security.config.http.SessionCreationPolicy
import org.springframework.security.crypto.argon2.Argon2PasswordEncoder
import org.springframework.security.web.SecurityFilterChain
import org.springframework.security.web.util.matcher.AntPathRequestMatcher


@Configuration
@EnableWebSecurity
class SecurityConfig() {

    @Bean
    @Throws(Exception::class)
    fun authenticationManager(
        httpSecurity: HttpSecurity,
        passwordEncoder: Argon2PasswordEncoder,
        userService: UserService
    ): AuthenticationManager {
        val builder = httpSecurity.getSharedObject(AuthenticationManagerBuilder::class.java)
        builder.userDetailsService(userService)
            .passwordEncoder(passwordEncoder)
        return builder.build()
    }

    @Bean
    @Throws(Exception::class)
    fun filterChain(http: HttpSecurity): SecurityFilterChain {
        http.csrf {
            it.disable()
        }
        http.sessionManagement {
            it.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
        }

        http.authorizeHttpRequests {
            it
                .requestMatchers(AntPathRequestMatcher.antMatcher("/sync/**")).hasRole(UserRoles.USER)

                .requestMatchers(AntPathRequestMatcher.antMatcher("/user/register")).permitAll()
                .requestMatchers(AntPathRequestMatcher.antMatcher("/user/**")).hasRole(UserRoles.USER)

                .requestMatchers(AntPathRequestMatcher.antMatcher("/error")).permitAll()
        }

        http.httpBasic(Customizer.withDefaults())

        return http.build()
    }

    @Bean
    fun passwordEncoder(): Argon2PasswordEncoder {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8()
    }
}
