package apps.chocolatecakecodes.invidious_ext.download.repo

import apps.chocolatecakecodes.invidious_ext.download.entity.StoredFile
import io.micronaut.data.annotation.Repository
import io.micronaut.data.jpa.repository.JpaRepository
import java.util.*

@Repository
interface StoredFileRepo : JpaRepository<StoredFile, Long> {

    fun findByPublicId(publicId: String): Optional<StoredFile>
}
