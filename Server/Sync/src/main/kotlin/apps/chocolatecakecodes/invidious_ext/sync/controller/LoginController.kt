package apps.chocolatecakecodes.invidious_ext.sync.controller

import apps.chocolatecakecodes.invidious_ext.sync.dto.RegistrationPayload
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import io.micronaut.http.HttpStatus
import io.micronaut.http.annotation.Body
import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Post
import io.micronaut.http.annotation.Status
import io.micronaut.security.annotation.Secured
import io.micronaut.security.rules.SecurityRule
import io.micronaut.validation.Validated
import jakarta.inject.Inject
import jakarta.validation.Valid

@Controller("/user")
@Secured(SecurityRule.IS_AUTHENTICATED)
@Validated
class LoginController(
    @Inject private val userService: UserService
) {

    @Post("register")
    @Status(HttpStatus.CREATED)
    @Secured(SecurityRule.IS_ANONYMOUS)
    fun register(@Body @Valid payload: RegistrationPayload) {
        userService.addNewUser(payload.username, payload.password)
    }
}

