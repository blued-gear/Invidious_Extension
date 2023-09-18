package apps.chocolatecakecodes.invidious_ext.download.enums

import io.micronaut.serde.annotation.Serdeable

@Serdeable
enum class DownloadJobState(val isFinished: Boolean) {
    INIT(false),
    STARTED(false),
    CANCELLED(true),
    DONE(true),
    FAILED(true)
}
