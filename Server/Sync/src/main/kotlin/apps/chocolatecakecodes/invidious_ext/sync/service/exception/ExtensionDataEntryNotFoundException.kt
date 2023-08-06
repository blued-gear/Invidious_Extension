package apps.chocolatecakecodes.invidious_ext.sync.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class ExtensionDataEntryNotFoundException(user: String, key: String) : HttpStatusException(HttpStatus.NOT_FOUND,
    "user '$user' has no extension_data entry with key '$key'")
