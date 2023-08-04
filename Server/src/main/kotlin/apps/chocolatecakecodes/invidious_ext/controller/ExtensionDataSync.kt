package apps.chocolatecakecodes.invidious_ext.controller

import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Get
import io.micronaut.security.annotation.Secured
import io.micronaut.security.rules.SecurityRule
import java.security.Principal

@Controller("/sync/extension")
@Secured(SecurityRule.IS_AUTHENTICATED)
class ExtensionDataSync {

    @Get("test")
    fun test(principal: Principal): String {
        return "\"hello ${principal.name}\""
    }
}
