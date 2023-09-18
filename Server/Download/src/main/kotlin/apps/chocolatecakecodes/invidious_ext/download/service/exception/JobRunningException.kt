package apps.chocolatecakecodes.invidious_ext.download.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class JobRunningException(id: String) : HttpStatusException(HttpStatus.TOO_EARLY,
    "job with id '$id' is still running")
