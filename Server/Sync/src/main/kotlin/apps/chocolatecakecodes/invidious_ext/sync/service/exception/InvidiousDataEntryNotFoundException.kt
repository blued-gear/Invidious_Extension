package apps.chocolatecakecodes.invidious_ext.sync.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class InvidiousDataEntryNotFoundException(user: String) : HttpStatusException(HttpStatus.NOT_FOUND,
    "user '$user' has no stored invidious_data")
