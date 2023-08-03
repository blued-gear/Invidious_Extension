package apps.chocolatecakecodes.invidious_ext.server.web

import apps.chocolatecakecodes.invidious_ext.server.dto.RegistrationPayload
import apps.chocolatecakecodes.invidious_ext.server.service.UserService
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController

@RestController
@RequestMapping("/user")
class LoginController(
    @Autowired private val userService: UserService
) {

    @PostMapping("register")
    fun register(@RequestBody payload: RegistrationPayload): ResponseEntity<String> {//TODO add @Valid with validator-constrains (name only a-z-_..., password min 8 chars ...)
        userService.addNewUser(payload.username, payload.password)
        return ResponseEntity(HttpStatus.CREATED)
    }
}
