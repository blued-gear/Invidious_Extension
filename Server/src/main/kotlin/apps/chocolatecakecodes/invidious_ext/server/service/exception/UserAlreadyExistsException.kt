package apps.chocolatecakecodes.invidious_ext.server.service.exception

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.ResponseStatus

@ResponseStatus(HttpStatus.CONFLICT)
class UserAlreadyExistsException(msg: String) : RuntimeException(msg)
