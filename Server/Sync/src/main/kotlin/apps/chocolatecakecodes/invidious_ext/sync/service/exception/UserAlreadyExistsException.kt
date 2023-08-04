package apps.chocolatecakecodes.invidious_ext.sync.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class UserAlreadyExistsException(msg: String) : HttpStatusException(HttpStatus.CONFLICT, msg)
