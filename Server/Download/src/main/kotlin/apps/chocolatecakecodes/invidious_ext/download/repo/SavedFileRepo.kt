package apps.chocolatecakecodes.invidious_ext.download.repo

import apps.chocolatecakecodes.invidious_ext.download.entity.SavedFile
import io.micronaut.data.annotation.Repository
import io.micronaut.data.jpa.repository.JpaRepository
import java.util.*

@Repository
interface SavedFileRepo : JpaRepository<SavedFile, Long> {

    fun findByPublicId(publicId: String): Optional<SavedFile>
}
