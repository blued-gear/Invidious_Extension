package apps.chocolatecakecodes.invidious_ext.sync.controller

import apps.chocolatecakecodes.invidious_ext.sync.dto.RegistrationPayload
import apps.chocolatecakecodes.invidious_ext.sync.service.UserService
import io.micronaut.http.HttpStatus
import io.micronaut.http.annotation.*
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
    @Secured(SecurityRule.IS_ANONYMOUS)
    @Status(HttpStatus.CREATED)
    fun register(@Body @Valid payload: RegistrationPayload) {
        userService.addNewUser(payload.username, payload.password)
    }

    // used to test login-credentials (either it returns 204 or a security-error)
    @Get("testLogin")
    @Status(HttpStatus.NO_CONTENT)
    fun testLogin(){}
}

