package apps.chocolatecakecodes.invidious_ext.download.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class JobNotFoundException(id: String) : HttpStatusException(HttpStatus.NOT_FOUND,
    "job with id '$id' does not exist")
