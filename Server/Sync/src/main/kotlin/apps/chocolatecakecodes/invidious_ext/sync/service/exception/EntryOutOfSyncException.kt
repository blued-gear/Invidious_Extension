package apps.chocolatecakecodes.invidious_ext.sync.service.exception

import io.micronaut.http.HttpStatus
import io.micronaut.http.exceptions.HttpStatusException

class EntryOutOfSyncException(msg: String) : HttpStatusException(HttpStatus.PRECONDITION_FAILED, msg)
