package apps.chocolatecakecodes.invidious_ext.sync.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class ExtensionDataEntryAlreadyExistsException(user: String, key: String) : HttpStatusException(HttpStatus.CONFLICT,
    "user '$user' has already an entry with key '$key'")
