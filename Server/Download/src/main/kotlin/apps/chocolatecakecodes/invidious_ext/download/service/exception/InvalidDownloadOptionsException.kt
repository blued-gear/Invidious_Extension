package apps.chocolatecakecodes.invidious_ext.download.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class InvalidDownloadOptionsException(msg: String) : HttpStatusException(HttpStatus.BAD_REQUEST, msg)
