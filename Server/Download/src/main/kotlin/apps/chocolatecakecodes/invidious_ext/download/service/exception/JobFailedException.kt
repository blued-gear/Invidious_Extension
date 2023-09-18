package apps.chocolatecakecodes.invidious_ext.download.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class JobFailedException(id: String) : HttpStatusException(HttpStatus.GONE,
    "job with id '$id' failed and was removed")
