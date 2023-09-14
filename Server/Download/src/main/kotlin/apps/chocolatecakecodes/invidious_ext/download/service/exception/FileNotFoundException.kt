package apps.chocolatecakecodes.invidious_ext.download.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class FileNotFoundException(publicId: String) : HttpStatusException(HttpStatus.NOT_FOUND,
    "file with id $publicId could not be found")
