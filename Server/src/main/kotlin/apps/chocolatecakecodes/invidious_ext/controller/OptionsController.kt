package apps.chocolatecakecodes.invidious_ext.controller

import io.micronaut.http.annotation.Controller
import io.micronaut.http.annotation.Options
import io.micronaut.http.annotation.PathVariable
import io.micronaut.security.annotation.Secured
import io.micronaut.security.rules.SecurityRule

/**
 * catch-all controller for preflight requests
 */
@Controller("/")
@Secured(value = [SecurityRule.IS_ANONYMOUS, SecurityRule.IS_AUTHENTICATED])
class OptionsController {

    @Options("{/path:.*}")
    fun handleOptions(@PathVariable path: String) {}
}
